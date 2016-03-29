# VoxImplant Client Side Conferencing using P2P Calls and Web Audio
Webapp folder contains web application built using Web SDK, ReactJS and TypeScript, it can act like conference host and can be connected to the conference by inbound call.
Webservice folder contains PHP script used to proxy requests to VoxImplant HTTP API to create users and authorization.

## Important Tips
1. Don't forget to replace YOUR_API_KEY, YOUR_ACCOUNT_NAME, APP_NAME and SOME_PASSWORD with your data in `auth.php`
2. Don't forget to replace YOUR_VOX_APPNAME, YOUR_VOX_ACCNAME and YOUR_DOMAIN with your data in `app.tsx`

### Building and running

The webapp uses webpack:

1. npm install
2. webpack

