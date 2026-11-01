// Push notifications service worker. Config is passed in the registration URL.
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');
const cfg = JSON.parse(decodeURIComponent(new URL(self.location).searchParams.get('c') || '{}'));
firebase.initializeApp(cfg);
firebase.messaging();
