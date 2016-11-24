FROM keymetrics/pm2-docker-alpine:latest

# Install git
RUN apk add --update git && rm -rf /tmp/* /var/cache/apk/*

# Set environment variables
ENV NPM_CONFIG_LOGLEVEL warn
ENV appDir /opt/app

# Set the work directory
RUN mkdir -p ${appDir}
WORKDIR ${appDir}

# Add our package.json and install *before* adding our application files
ADD package.json ./
RUN /usr/bin/node \
  --max_semi_space_size=1 \
  --max_old_space_size=198 \
  --max_executable_size=148 \
  /usr/bin/npm install

# Add application files
ADD . ./

# Expose the port
EXPOSE 8080

CMD ["pm2-docker", "start", "pm2.json"]
