import { httpRouter } from "convex/server";
import { Webhook } from "svix";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = await validateRequest(request);
    if (event === null) {
      return new Response("Invalid webhook", { status: 400 });
    }

    switch (event.type) {
      case "user.created":
      case "user.updated": {
        const user = parseClerkUser(event.data);
        if (user === null) {
          return new Response("Invalid user payload", { status: 400 });
        }
        await ctx.runMutation(internal.users.upsertFromClerk, user);
        break;
      }
      case "user.deleted": {
        const clerkUserId = parseDeletedUserId(event.data);
        if (clerkUserId === null) {
          return new Response("Invalid deleted user payload", { status: 400 });
        }
        await ctx.runMutation(internal.users.deleteFromClerk, { clerkUserId });
        break;
      }
      default:
        console.log("Ignored Clerk webhook event", event.type);
    }

    return new Response(null, { status: 200 });
  }),
});

export default http;

async function validateRequest(req: Request) {
  const payloadString = await req.text();
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");
  const secret = process.env.CLERK_WEBHOOK_SECRET;

  if (!svixId || !svixTimestamp || !svixSignature || !secret) {
    console.error("Missing Svix headers or CLERK_WEBHOOK_SECRET");
    return null;
  }

  try {
    const payload: unknown = new Webhook(secret).verify(payloadString, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
    return parseClerkEvent(payload);
  } catch (error) {
    console.error("Error verifying webhook event", error);
    return null;
  }
}

function parseClerkEvent(payload: unknown) {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  const record = payload as Record<string, unknown>;
  if (typeof record.type !== "string") {
    return null;
  }
  return { type: record.type, data: record.data };
}

function parseClerkUser(data: unknown) {
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const record = data as Record<string, unknown>;
  if (typeof record.id !== "string" || record.id.length === 0) {
    return null;
  }

  const firstName = typeof record.first_name === "string" ? record.first_name : "";
  const lastName = typeof record.last_name === "string" ? record.last_name : "";
  const username = typeof record.username === "string" ? record.username : "";
  const imageUrl =
    typeof record.image_url === "string" ? record.image_url : undefined;
  const email = primaryEmail(record);

  const name =
    `${firstName} ${lastName}`.trim() || username || email || "Anonymous";

  return {
    externalId: record.id,
    name,
    ...(email !== undefined ? { email } : {}),
    ...(imageUrl !== undefined ? { imageUrl } : {}),
  };
}

function parseDeletedUserId(data: unknown) {
  if (typeof data !== "object" || data === null) {
    return null;
  }
  const id = (data as Record<string, unknown>).id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

function primaryEmail(record: Record<string, unknown>) {
  const emails = record.email_addresses;
  if (!Array.isArray(emails)) {
    return undefined;
  }

  const primaryId = record.primary_email_address_id;
  const rows = emails.filter(
    (entry): entry is Record<string, unknown> =>
      typeof entry === "object" && entry !== null,
  );
  const primary = rows.find(
    (entry) =>
      entry.id === primaryId && typeof entry.email_address === "string",
  );
  const fallback = rows.find(
    (entry) => typeof entry.email_address === "string",
  );
  const chosen = primary ?? fallback;
  return typeof chosen?.email_address === "string"
    ? chosen.email_address
    : undefined;
}
