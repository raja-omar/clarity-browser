import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import keytar from "keytar";
import { google } from "googleapis";
import open from "open";
import bundledOAuthClient from "./googleOAuthClient.json";

const TOKEN_SERVICE = "clarity-browser";
const TOKEN_ACCOUNT = "google-calendar-refresh-token";
const DEFAULT_OAUTH_PORT = 53682;
const DEFAULT_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

interface BundledInstalledClientConfig {
  installed?: {
    client_id?: string;
    client_secret?: string;
    redirect_uris?: string[];
  };
  web?: {
    client_id?: string;
    client_secret?: string;
    redirect_uris?: string[];
  };
}

export interface GoogleAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  oauthPort: number;
  oauthScopes: string[];
}

function getBundledCredentials():
  | {
      clientId?: string;
      clientSecret?: string;
      redirectUri?: string;
    }
  | undefined {
  const config = bundledOAuthClient as BundledInstalledClientConfig;
  const client = config.installed ?? config.web;
  if (!client) return undefined;

  const clientId = client.client_id?.trim();
  const clientSecret = client.client_secret?.trim();
  const redirectUri = client.redirect_uris?.find((uri) => uri?.trim())?.trim();

  return { clientId, clientSecret, redirectUri };
}

function getLocalConfigPath(): string | undefined {
  const fileName = "googleOAuthClient.local.json";
  const candidates: string[] = [
    join(process.cwd(), "electron", fileName),
    join(process.cwd(), fileName),
  ];
  if (typeof __dirname !== "undefined") {
    candidates.unshift(join(__dirname, "..", "electron", fileName));
    candidates.unshift(join(__dirname, fileName));
  } else {
    try {
      const currentDir = dirname(fileURLToPath(import.meta.url));
      candidates.unshift(join(currentDir, "..", "electron", fileName));
      candidates.unshift(join(currentDir, fileName));
    } catch {
      // ESM fallback not available
    }
  }
  return candidates.find((path) => existsSync(path));
}

function getLocalCredentials():
  | {
      clientId?: string;
      clientSecret?: string;
      redirectUri?: string;
    }
  | undefined {
  const localConfigPath = getLocalConfigPath();
  if (!localConfigPath) return undefined;

  try {
    const raw = readFileSync(localConfigPath, "utf8");
    const config = JSON.parse(raw) as BundledInstalledClientConfig;
    const client = config.installed ?? config.web;
    if (!client) return undefined;

    const clientId = client.client_id?.trim();
    const clientSecret = client.client_secret?.trim();
    const redirectUri = client.redirect_uris?.find((uri) => uri?.trim())?.trim();

    return { clientId, clientSecret, redirectUri };
  } catch {
    return undefined;
  }
}

export function getGoogleAuthConfig(): { config?: GoogleAuthConfig; error?: string } {
  const localCredentials = getLocalCredentials();
  const bundledCredentials = getBundledCredentials();
  const clientId =
    localCredentials?.clientId || bundledCredentials?.clientId || process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret =
    localCredentials?.clientSecret ||
    bundledCredentials?.clientSecret ||
    process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return {
      error:
        "Google Calendar is not configured. Create electron/googleOAuthClient.local.json with your Google OAuth client_id and client_secret (see electron/googleOAuthClient.json for the format). This file is gitignored and will not be pushed.",
    };
  }

  const oauthPort = Number(process.env.GOOGLE_OAUTH_PORT ?? DEFAULT_OAUTH_PORT);
  const redirectUri =
    localCredentials?.redirectUri?.trim() ||
    bundledCredentials?.redirectUri?.trim() ||
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    `http://127.0.0.1:${oauthPort}/oauth2callback`;
  const oauthScopes = (process.env.GOOGLE_OAUTH_SCOPES ?? DEFAULT_SCOPE)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  try {
    const parsed = new URL(redirectUri);
    if (
      parsed.protocol !== "http:" ||
      parsed.hostname !== "127.0.0.1" ||
      parsed.pathname !== "/oauth2callback"
    ) {
      return {
        error:
          "The Google OAuth redirect URI must be a loopback callback like http://127.0.0.1:53682/oauth2callback.",
      };
    }
  } catch {
    return {
      error:
        "The Google OAuth redirect URI is invalid. Use http://127.0.0.1:53682/oauth2callback.",
    };
  }

  return {
    config: {
      clientId,
      clientSecret,
      redirectUri,
      oauthPort,
      oauthScopes,
    },
  };
}

export function createOAuthClient(config: GoogleAuthConfig) {
  return new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
}

export async function saveRefreshToken(refreshToken: string): Promise<void> {
  await keytar.setPassword(TOKEN_SERVICE, TOKEN_ACCOUNT, refreshToken);
}

export async function getSavedRefreshToken(): Promise<string | null> {
  return keytar.getPassword(TOKEN_SERVICE, TOKEN_ACCOUNT);
}

export async function deleteSavedRefreshToken(): Promise<void> {
  await keytar.deletePassword(TOKEN_SERVICE, TOKEN_ACCOUNT);
}

export async function connectGoogleCalendar(): Promise<void> {
  const { config, error } = getGoogleAuthConfig();
  if (!config) {
    throw new Error(error || "Google Calendar is not configured.");
  }

  const oauth2Client = createOAuthClient(config);
  const state = randomUUID();

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error("Google sign-in timed out. Please try again."));
    }, 120000);

    const server = createServer((req, res) => {
      try {
        if (!req.url) {
          throw new Error("Missing request URL");
        }

        const requestUrl = new URL(req.url, `http://127.0.0.1:${config.oauthPort}`);
        if (requestUrl.pathname !== "/oauth2callback") {
          res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Not found");
          return;
        }

        const code = requestUrl.searchParams.get("code");
        const authError = requestUrl.searchParams.get("error");
        const returnedState = requestUrl.searchParams.get("state");

        if (authError) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<h2>Google authorization failed. You can close this window.</h2>");
          clearTimeout(timeout);
          server.close();
          reject(new Error(`Google authorization failed: ${authError}`));
          return;
        }

        if (!code || returnedState !== state) {
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end("<h2>Missing or invalid authorization code. You can close this window.</h2>");
          clearTimeout(timeout);
          server.close();
          reject(new Error("Google authorization was interrupted. Please try again."));
          return;
        }

        void oauth2Client
          .getToken(code)
          .then(async ({ tokens }) => {
            if (!tokens.refresh_token) {
              throw new Error(
                "No refresh token returned. Make sure prompt=consent is used and the user approved access.",
              );
            }

            await saveRefreshToken(tokens.refresh_token);
            oauth2Client.setCredentials(tokens);

            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end("<h2>Google Calendar connected. You can close this window.</h2>");

            clearTimeout(timeout);
            server.close();
            resolve();
          })
          .catch((tokenError) => {
            res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
            res.end("<h2>Google token exchange failed. You can close this window.</h2>");
            clearTimeout(timeout);
            server.close();
            reject(tokenError);
          });
      } catch (requestError) {
        clearTimeout(timeout);
        server.close();
        reject(requestError);
      }
    });

    server.on("error", (serverError) => {
      clearTimeout(timeout);
      reject(serverError);
    });

    server.listen(config.oauthPort, "127.0.0.1", async () => {
      try {
        const authUrl = oauth2Client.generateAuthUrl({
          access_type: "offline",
          scope: config.oauthScopes,
          prompt: "consent",
          include_granted_scopes: true,
          state,
        });

        await open(authUrl);
      } catch (openError) {
        clearTimeout(timeout);
        server.close();
        reject(openError);
      }
    });
  });
}
