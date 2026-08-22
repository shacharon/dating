export {
  authenticatedFetch,
  type AuthenticatedFetchInit,
} from "@/lib/authenticated-fetch";

/** Story 3 alias — product APIs use `authenticatedFetch` directly. */
export { authenticatedFetch as apiClientFetch } from "@/lib/authenticated-fetch";
