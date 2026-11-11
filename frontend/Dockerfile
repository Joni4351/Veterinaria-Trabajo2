FROM node:22-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY . ./
# Same-origin API requests are forwarded by Nginx, without embedding host URLs or secrets.
ENV VITE_API_URL=""
RUN npm run build

FROM nginx:stable-alpine AS runtime
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /src/dist /usr/share/nginx/html
EXPOSE 8080
USER nginx
ENTRYPOINT ["nginx"]
CMD ["-g", "daemon off;"]
