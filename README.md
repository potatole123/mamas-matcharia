Mama's Matcharia

https://mamas-matcharia.vercel.app/

## Run with Docker

Create local env files from the examples:

```bash
cp server/.docker.env.example server/.docker.env
cp client/.docker.env.example client/.docker.env
```

Fill in the Firebase values, then start the app:

```bash
docker compose up --build
```

Client: http://localhost:5173
Server: http://localhost:5001
