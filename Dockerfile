# Build the SPA, then serve it with nginx (which also proxies /api + /ws to the
# backend — see nginx.conf). VITE_API_URL is left empty on purpose: requests use
# relative paths and nginx routes them, so frontend and backend share one origin.
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
