# Story 7: Socket uses the public site, not port 3001

**Status:** Proposed  
**Depends on:** none (ship with the UI image)

## Why

On findyouraidate.com the browser calls `https://findyouraidate.com:3001/socket.io/`. Port 3001 is not public. The site is HTTPS on 443. Locally the same code uses `localhost:3001`, where the API is listening, so the socket connects.

## What

**As a** signed-in user on the live site  
**I want** the messaging socket on the same host as the page  
**So that** realtime connects through the load balancer

### Acceptance criteria

- [ ] Deployed UI does not open `findyouraidate.com:3001`
- [ ] The socket origin on the live site is `https://findyouraidate.com` on port 443
- [ ] Local dev still uses `http://localhost:3001` directly, because the Next dev proxy breaks the WebSocket upgrade
- [ ] After connect, DevTools shows a websocket upgrade (101), not a polling request every few seconds

### Out of scope

- The API `wget` health check (Story 2)
- New messaging features

## Definition of done

- [ ] `getMessagingSocketOrigin()` keeps port 3001 for local dev and uses the page origin on the deployed site
- [ ] Rebuilt UI image is what `dating-dev-ui` runs
- [ ] Checked in the browser on findyouraidate.com
