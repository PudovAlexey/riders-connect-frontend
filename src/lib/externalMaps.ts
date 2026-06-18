// Deep links into external map services that build a DRIVING route from the
// user's current location to a point. Pure URL builders, no side effects.
// Opened via <a target="_blank">; on mobile the OS hands these off to the
// installed Yandex / 2GIS / Google Maps apps.
//
// Coordinate order differs per provider — Yandex/Google take lat,lon while
// 2GIS takes lon,lat — so each builder spells it out explicitly.

/**
 * Yandex Maps driving route. `rtext` is "lat,lon~lat,lon"; a leading "~"
 * (empty first waypoint) means "from my current location". rtt=auto = car.
 */
export const yandexRouteUrl = (lat: number, lon: number) =>
  `https://yandex.ru/maps/?rtext=~${lat}%2C${lon}&rtt=auto`

/**
 * Google Maps (URLs API). origin omitted → current location is used.
 */
export const googleRouteUrl = (lat: number, lon: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat}%2C${lon}&travelmode=driving`

/**
 * 2GIS driving route. 2GIS uses lon,lat order. The leading "|" (encoded %7C)
 * leaves the origin empty so 2GIS routes from the user's current location.
 * NOTE: 2GIS's URL scheme is version-sensitive — if this stops auto-building
 * the route, try instead:
 *   https://2gis.ru/routeSearch/rsType/car/to/{lon}%2C{lat}
 */
export const dgisRouteUrl = (lat: number, lon: number) =>
  `https://2gis.ru/directions/points/%7C${lon}%2C${lat}`
