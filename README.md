# Paste-pal

**Paste-pal** is a synchronized clipboard between devices — perfect for quickly sharing content across device clipboards without needing to install a separate messaging service.

Create a room on one device, join with the room code from another, and start sharing instantly.

* **Hosting**: Vercel
* **Database**: Supabase
* **Styling**: Tailwind CSS

---

## 🚀 Getting Started

Clone this project and install dependencies with your preferred package manager:

```sh
npm install
# or
pnpm install
# or
yarn install
```

Start the development server:

```sh
npm run dev
```

Or start the server and open the app in a new browser tab automatically:

```sh
npm run dev -- --open
```

---

## 📦 Deploying

Every push to the `main` branch triggers a Vercel pipeline and publishes the latest version of the app.
Visit it live at: **[https://paste-pal.vercel.app/](https://paste-pal.vercel.app/)**

---

## Reloading supabase types

To reload database types:
```sh
npx supabase gen types typescript --project-id project-id > src/lib/types/supabase.ts
```

Replace project id with actual project id (you can retrieve the project id in the supabase project settings).

---

## ⚠️ Notes

* The app currently behaves inconsistently in **Firefox**.
* For the best experience, please use **Google Chrome**.
