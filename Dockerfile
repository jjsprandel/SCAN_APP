# Use Node.js base image
FROM node:22.14.0

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available) to the container
COPY package*.json ./

# Install dependencies
RUN npm install

# If we're deploying, install firebase tools
ARG GITHUB_ACTIONS
RUN if [ "$GITHUB_ACTIONS" = "true" ]; then npm install -g firebase-tools; fi

# Copy the rest of the app's files into the container
COPY . .

# Expose the app's port for local development
EXPOSE 3000

# If we're running locally, start the app
CMD if [ -z "$GITHUB_ACTIONS" ]; then npm start; fi
