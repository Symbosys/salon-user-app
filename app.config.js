module.exports = ({ config }) => ({
  ...config,

  extra: {
    ...config.extra,
    googleMapsWebApiKey: process.env.GOOGLE_MAPS_API_KEY,
  },
});
