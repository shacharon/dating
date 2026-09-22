# Story 7: Socket uses the public site, not port 3001

**Status:** Done (UI image and live check pending)  
**Shipped on main:** `40707e1`  
**Feature tip ahead of main:** 0  
**Depends on:** none (ship with the UI image)

## Why

On findyouraidate.com the browser calls `https://findyouraidate.com:3001/socket.io/`. Port 3001 is not public. The site is HTTPS on 443. Locally the same code uses `localhost:3001`, where the API is listening, so the socket connects.

## What

**As a** signed-in user on the live site  
**I want** the messaging socket on the same host as the page  
**So that** realtime connects through the load balancer

### Acceptance criteria

- [ ] Deployed UI does not open `findyouraidate.com:3001` — **pending UI image**
- [ ] The socket origin on the live site is `https://findyouraidate.com` on port 443 — **pending UI image**
- [x] Local dev still uses `http://localhost:3001` directly, because the Next dev proxy breaks the WebSocket upgrade
- [ ] After connect, DevTools shows a websocket upgrade (101), not a polling request every few seconds — **Agent 5 after the image rolls**

### Out of scope

- The API `wget` health check (Story 2)
- New messaging features

## Definition of done

- [x] `getMessagingSocketOrigin()` keeps port 3001 for local dev and uses the page origin on the deployed site
- [ ] Rebuilt UI image is what `dating-dev-ui` runs — **pending deploy**
- [ ] Checked in the browser on findyouraidate.com — **Agent 5**
