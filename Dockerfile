# Use Node.js base image
FROM node:22.14.0

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (or npm-shrinkwrap.json)
COPY package*.json ./ 

# Install project dependencies
RUN npm install

# Copy the rest of the app files
COPY . .

# Build the React app for production
RUN npm run build

# Install Firebase CLI globally
RUN npm install -g firebase-tools

# Set the environment variable for Firebase authentication
ENV GOOGLE_APPLICATION_CREDENTIALS=/app/firebase-service-account.json

# Define the command to deploy to Firebase
CMD firebase deploy
