export {
  authenticatedFetch,
  type AuthenticatedFetchInit,
} from "@/lib/auth/authenticated-fetch";

/** Story 3 alias — product APIs use `authenticatedFetch` directly. */
export { authenticatedFetch as apiClientFetch } from "@/lib/auth/authenticated-fetch";
