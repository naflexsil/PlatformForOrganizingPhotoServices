#!/bin/sh
set -e
: "${BACKEND_URL:=http://backend:3000}"
envsubst '${BACKEND_URL}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf
exec nginx -g 'daemon off;'
