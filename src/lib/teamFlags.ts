/** ISO 3166-1 alpha-2 codes for FIFA World Cup 2022 nations (StatsBomb team names). */
const TEAM_COUNTRY_CODES: Record<string, string> = {
  Argentina: "ar",
  Australia: "au",
  Belgium: "be",
  Brazil: "br",
  Cameroon: "cm",
  Canada: "ca",
  "Costa Rica": "cr",
  Croatia: "hr",
  Denmark: "dk",
  Ecuador: "ec",
  England: "gb-eng",
  France: "fr",
  Germany: "de",
  Ghana: "gh",
  Iran: "ir",
  Japan: "jp",
  Mexico: "mx",
  Morocco: "ma",
  Netherlands: "nl",
  Poland: "pl",
  Portugal: "pt",
  Qatar: "qa",
  "Saudi Arabia": "sa",
  Senegal: "sn",
  Serbia: "rs",
  "South Korea": "kr",
  Spain: "es",
  Switzerland: "ch",
  Tunisia: "tn",
  Uruguay: "uy",
  USA: "us",
  Wales: "gb-wls",
};

export function teamCountryCode(teamName: string): string | undefined {
  return TEAM_COUNTRY_CODES[teamName];
}

export function teamFlagUrl(teamName: string, width = 40): string | undefined {
  const code = teamCountryCode(teamName);
  if (!code) return undefined;
  return `https://flagcdn.com/w${width}/${code}.png`;
}
