# Kenitra Honey Shop

## What it includes
- Arabic RTL storefront
- Products loaded live from Firebase Realtime Database
- Articles/blog
- WhatsApp order button with product name, price, weight
- Admin page with Firebase Authentication
- Product/article image uploads to Firebase Storage
- Edit/delete products and articles
- Editable shop name, WhatsApp number, hero text
- Responsive mobile/desktop layout

## Firebase setup (required once)
1. Firebase Console > Authentication > Sign-in method > enable Email/Password.
2. Authentication > Users > Add user. This email/password is your admin login.
3. Realtime Database > Rules: paste `database.rules.json`.
4. Storage > Rules: paste `storage.rules`.
5. Open `/admin.html`, login, set your WhatsApp number in Settings.
6. Optional: click "إضافة محتوى تجريبي" once.

## WhatsApp number
Use international format without `+`, for example Morocco: `2126XXXXXXXX`.

## Deploy
Upload the folder to your GitHub repo connected to Vercel, or deploy as a static Vercel project.
