# Groundhog Game

Game of Internetnacht 2023.

## Install

```bash
npm install
```

## Define Environment
Create a `.env`-file containing the following parameters:
```
PORT=
```

## Build the Docker image

```bash
docker build . -t jo/node-web-app
```

## Run the Docker image

```bash
docker run -p 49160:3000 -d jo/node-web-app
```

## Print output of the app

```bash
# Get container ID
$ docker ps

# Print app output
$ docker logs <container id>
# Example
Running
```

## Get into the container

```bash
docker exec -it <container id> /bin/bash
```

## Stop the container

```bash
docker kill <container id>
```
