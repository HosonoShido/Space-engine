export default function countryCodeToEmoji(code) {
  return code?.toUpperCase().replace(/./g, c =>
    String.fromCodePoint(127397 + c.charCodeAt())
  );
}