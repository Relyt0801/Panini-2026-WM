/*
 * Panini WM 2026 – Datensatz (installierbare PWA)
 * --------------------------------------------------------------------------
 * Offizielle Checkliste (vom Nutzer aus dem Album übertragen):
 *   • FWC 00–19   : 20 Spezial-Sticker (Logo, Emblem, Maskottchen, Ball,
 *                   Gastgeber, 11 WM-History-Fotos der Weltmeister)
 *   • 48 Teams    : je Karten 1–20  (1 = Emblem/Folie, 13 = Mannschaftsfoto,
 *                   Rest Spieler)  → 960 Sticker
 *   → 980 Basis-Sticker
 * Bonus-Gruppen (nicht in den 980):
 *   • Extra-Sticker: 20 Stars × 4 Varianten (Lila/Bronze/Silber/Gold), ~1:100
 *   • Coca-Cola    : CC1–CC12
 * Glanz/Silber-Parallele: nur DFB (players only).
 */

const TEAM_SLOTS = 20;
const FWC_SLOTS = 20;        // 00–19
const COCA_SLOTS = 12;       // CC1–CC12
const EXTRA_VARIANTS = ["Lila", "Bronze", "Silber", "Gold"];

/* ---- 48 qualifizierte Nationen ---------------------------------------- */
const TEAMS = [
  { code: "MEX", name: "Mexiko",             flag: "🇲🇽", conf: "Gastgeber", group: "A" },
  { code: "CAN", name: "Kanada",             flag: "🇨🇦", conf: "Gastgeber", group: "B" },
  { code: "USA", name: "USA",                flag: "🇺🇸", conf: "Gastgeber", group: "D" },

  { code: "GER", name: "Deutschland",        flag: "🇩🇪", conf: "UEFA", group: "E" },
  { code: "FRA", name: "Frankreich",         flag: "🇫🇷", conf: "UEFA", group: "I" },
  { code: "ENG", name: "England",            flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", conf: "UEFA", group: "L" },
  { code: "ESP", name: "Spanien",            flag: "🇪🇸", conf: "UEFA", group: "H" },
  { code: "POR", name: "Portugal",           flag: "🇵🇹", conf: "UEFA", group: "K" },
  { code: "NED", name: "Niederlande",        flag: "🇳🇱", conf: "UEFA", group: "F" },
  { code: "CRO", name: "Kroatien",           flag: "🇭🇷", conf: "UEFA", group: "L" },
  { code: "BEL", name: "Belgien",            flag: "🇧🇪", conf: "UEFA", group: "G" },
  { code: "SUI", name: "Schweiz",            flag: "🇨🇭", conf: "UEFA", group: "B" },
  { code: "AUT", name: "Österreich",         flag: "🇦🇹", conf: "UEFA", group: "J" },
  { code: "NOR", name: "Norwegen",           flag: "🇳🇴", conf: "UEFA", group: "I" },
  { code: "SCO", name: "Schottland",         flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", conf: "UEFA", group: "C" },
  { code: "TUR", name: "Türkei",             flag: "🇹🇷", conf: "UEFA", group: "D" },
  { code: "SWE", name: "Schweden",           flag: "🇸🇪", conf: "UEFA", group: "F" },
  { code: "CZE", name: "Tschechien",         flag: "🇨🇿", conf: "UEFA", group: "A" },
  { code: "BIH", name: "Bosnien-Herzegowina",flag: "🇧🇦", conf: "UEFA", group: "B" },

  { code: "ARG", name: "Argentinien",        flag: "🇦🇷", conf: "CONMEBOL", group: "J" },
  { code: "BRA", name: "Brasilien",          flag: "🇧🇷", conf: "CONMEBOL", group: "C" },
  { code: "URU", name: "Uruguay",            flag: "🇺🇾", conf: "CONMEBOL", group: "H" },
  { code: "COL", name: "Kolumbien",          flag: "🇨🇴", conf: "CONMEBOL", group: "K" },
  { code: "ECU", name: "Ecuador",            flag: "🇪🇨", conf: "CONMEBOL", group: "E" },
  { code: "PAR", name: "Paraguay",           flag: "🇵🇾", conf: "CONMEBOL", group: "D" },

  { code: "PAN", name: "Panama",             flag: "🇵🇦", conf: "CONCACAF", group: "L" },
  { code: "CUW", name: "Curaçao",            flag: "🇨🇼", conf: "CONCACAF", group: "E" },
  { code: "HAI", name: "Haiti",              flag: "🇭🇹", conf: "CONCACAF", group: "C" },

  { code: "MAR", name: "Marokko",            flag: "🇲🇦", conf: "CAF", group: "C" },
  { code: "SEN", name: "Senegal",            flag: "🇸🇳", conf: "CAF", group: "I" },
  { code: "CIV", name: "Elfenbeinküste",     flag: "🇨🇮", conf: "CAF", group: "E" },
  { code: "EGY", name: "Ägypten",            flag: "🇪🇬", conf: "CAF", group: "G" },
  { code: "ALG", name: "Algerien",           flag: "🇩🇿", conf: "CAF", group: "J" },
  { code: "TUN", name: "Tunesien",           flag: "🇹🇳", conf: "CAF", group: "F" },
  { code: "GHA", name: "Ghana",              flag: "🇬🇭", conf: "CAF", group: "L" },
  { code: "RSA", name: "Südafrika",          flag: "🇿🇦", conf: "CAF", group: "A" },
  { code: "CPV", name: "Kap Verde",          flag: "🇨🇻", conf: "CAF", group: "H" },
  { code: "COD", name: "DR Kongo",           flag: "🇨🇩", conf: "CAF", group: "K" },

  { code: "JPN", name: "Japan",              flag: "🇯🇵", conf: "AFC", group: "F" },
  { code: "KOR", name: "Südkorea",           flag: "🇰🇷", conf: "AFC", group: "A" },
  { code: "IRN", name: "Iran",               flag: "🇮🇷", conf: "AFC", group: "G" },
  { code: "AUS", name: "Australien",         flag: "🇦🇺", conf: "AFC", group: "D" },
  { code: "KSA", name: "Saudi-Arabien",      flag: "🇸🇦", conf: "AFC", group: "H" },
  { code: "QAT", name: "Katar",              flag: "🇶🇦", conf: "AFC", group: "B" },
  { code: "UZB", name: "Usbekistan",         flag: "🇺🇿", conf: "AFC", group: "K" },
  { code: "JOR", name: "Jordanien",          flag: "🇯🇴", conf: "AFC", group: "J" },
  { code: "IRQ", name: "Irak",               flag: "🇮🇶", conf: "AFC", group: "I" },

  { code: "NZL", name: "Neuseeland",         flag: "🇳🇿", conf: "OFC", group: "G" },
];

/* ---- FWC 00–19 -------------------------------------------------------- */
const FWC_NAMES = {
  0: "Panini Logo",
  1: "Offizielles Emblem 1/2",
  2: "Offizielles Emblem 2/2",
  3: "Offizielle Maskottchen",
  4: "Offizieller Slogan",
  5: "Offizieller Spielball",
  6: "Gastgeber Kanada",
  7: "Gastgeber Mexiko",
  8: "Gastgeber USA",
  9: "Weltmeister 1934 · Italien",
  10: "Weltmeister 1950 · Uruguay",
  11: "Weltmeister 1954 · BR Deutschland",
  12: "Weltmeister 1962 · Brasilien",
  13: "Weltmeister 1974 · BR Deutschland",
  14: "Weltmeister 1986 · Argentinien",
  15: "Weltmeister 1994 · Brasilien",
  16: "Weltmeister 2002 · Brasilien",
  17: "Weltmeister 2006 · Italien",
  18: "Weltmeister 2014 · Deutschland",
  19: "Weltmeister 2022 · Argentinien",
};

/* ---- Coca-Cola CC1–CC12 (Bonus) --------------------------------------- */
const COCA_NAMES = {
  1: "Lamine Yamal", 2: "Joshua Kimmich", 3: "Eduardo Camavinga",
  4: "Joško Gvardiol", 5: "Federico Valverde", 6: "Virgil van Dijk",
  7: "Alphonso Davies", 8: "Raúl Jiménez", 9: "William Saliba",
  10: "Lautaro Martínez", 11: "Harry Kane", 12: "Antonee Robinson",
};

/* ---- Extra-Sticker: 20 Stars × 4 Varianten (Bonus) -------------------- */
const EXTRA_PLAYERS = [
  { name: "Lionel Messi", team: "ARG", flag: "🇦🇷" },
  { name: "Cristiano Ronaldo", team: "POR", flag: "🇵🇹" },
  { name: "Kylian Mbappé", team: "FRA", flag: "🇫🇷" },
  { name: "Lamine Yamal", team: "ESP", flag: "🇪🇸" },
  { name: "Jude Bellingham", team: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Vinícius Júnior", team: "BRA", flag: "🇧🇷" },
  { name: "Erling Haaland", team: "NOR", flag: "🇳🇴" },
  { name: "Florian Wirtz", team: "GER", flag: "🇩🇪" },
  { name: "Mohamed Salah", team: "EGY", flag: "🇪🇬" },
  { name: "Heung-min Son", team: "KOR", flag: "🇰🇷" },
  { name: "Achraf Hakimi", team: "MAR", flag: "🇲🇦" },
  { name: "Cody Gakpo", team: "NED", flag: "🇳🇱" },
  { name: "Luka Modrić", team: "CRO", flag: "🇭🇷" },
  { name: "Jérémy Doku", team: "BEL", flag: "🇧🇪" },
  { name: "Alphonso Davies", team: "CAN", flag: "🇨🇦" },
  { name: "Christian Pulisic", team: "USA", flag: "🇺🇸" },
  { name: "Raúl Jiménez", team: "MEX", flag: "🇲🇽" },
  { name: "Luis Díaz", team: "COL", flag: "🇨🇴" },
  { name: "Moisés Caicedo", team: "ECU", flag: "🇪🇨" },
  { name: "Federico Valverde", team: "URU", flag: "🇺🇾" },
];

/* ---- Spieler je Team (Nr. 2–12 & 14–20; 1=Emblem, 13=Mannschaftsfoto) -- */
const PLAYERS = {
  ALG: { 2:"Alexis Guendouz",3:"Ramy Bensebaini",4:"Youcef Atal",5:"Rayan Aït-Nouri",6:"Mohamed Amine Tougai",7:"Aïssa Mandi",8:"Ismael Bennacer",9:"Houssem Aouar",10:"Hicham Boudaoui",11:"Ramiz Zerrouki",12:"Nabil Bentaleb",14:"Farès Chaibi",15:"Riyad Mahrez",16:"Saïd Benrahma",17:"Anis Hadj Moussa",18:"Amine Gouiri",19:"Baghdad Bounedjah",20:"Mohammed Amoura" },
  ARG: { 2:"Emiliano Martínez",3:"Nahuel Molina",4:"Cristian Romero",5:"Nicolás Otamendi",6:"Nicolás Tagliafico",7:"Leonardo Balerdi",8:"Enzo Fernández",9:"Alexis Mac Allister",10:"Rodrigo De Paul",11:"Exequiel Palacios",12:"Leandro Paredes",14:"Nico Paz",15:"Franco Mastantuono",16:"Nico González",17:"Lionel Messi",18:"Lautaro Martínez",19:"Julián Álvarez",20:"Giuliano Simeone" },
  AUS: { 2:"Mathew Ryan",3:"Joe Gauci",4:"Harry Souttar",5:"Alessandro Circati",6:"Jordan Bos",7:"Aziz Behich",8:"Cameron Burgess",9:"Lewis Miller",10:"Milos Degenek",11:"Jackson Irvine",12:"Riley McGree",14:"Aiden O'Neill",15:"Connor Metcalfe",16:"Patrick Yazbek",17:"Craig Goodwin",18:"Kusini Vengi",19:"Nestory Irankunda",20:"Mohamed Touré" },
  AUT: { 2:"Alexander Schlager",3:"Patrick Pentz",4:"David Alaba",5:"Kevin Danso",6:"Philipp Lienhart",7:"Stefan Posch",8:"Phillipp Mwene",9:"Alexander Prass",10:"Xaver Schlager",11:"Marcel Sabitzer",12:"Konrad Laimer",14:"Florian Grillitsch",15:"Nicolas Seiwald",16:"Romano Schmid",17:"Patrick Wimmer",18:"Christoph Baumgartner",19:"Michael Gregoritsch",20:"Marko Arnautović" },
  BEL: { 2:"Thibaut Courtois",3:"Arthur Theate",4:"Timothy Castagne",5:"Zeno Debast",6:"Brandon Mechele",7:"Maxim De Cuyper",8:"Thomas Meunier",9:"Youri Tielemans",10:"Amadou Onana",11:"Nicolas Raskin",12:"Alexis Saelemaekers",14:"Hans Vanaken",15:"Kevin De Bruyne",16:"Jérémy Doku",17:"Charles De Ketelaere",18:"Leandro Trossard",19:"Loïs Openda",20:"Romelu Lukaku" },
  BIH: { 2:"Nikola Vasilj",3:"Amer Dedić",4:"Sead Kolašinac",5:"Tarik Muharemović",6:"Nihad Mujakić",7:"Nikola Katić",8:"Amir Hadžiahmetović",9:"Benjamin Tahirović",10:"Armin Gigović",11:"Ivan Šunjić",12:"Ivan Bašić",14:"Dženis Burnić",15:"Esmir Bajraktarević",16:"Amar Memić",17:"Ermedin Demirović",18:"Edin Džeko",19:"Samed Baždar",20:"Haris Tabaković" },
  BRA: { 2:"Alisson",3:"Bento",4:"Marquinhos",5:"Éder Militão",6:"Gabriel Magalhães",7:"Danilo",8:"Wesley",9:"Lucas Paquetá",10:"Casemiro",11:"Bruno Guimarães",12:"Luiz Henrique",14:"Vinícius Júnior",15:"Rodrygo",16:"João Pedro",17:"Matheus Cunha",18:"Gabriel Martinelli",19:"Raphinha",20:"Estêvão" },
  CAN: { 2:"Dayne St. Clair",3:"Alphonso Davies",4:"Alistair Johnston",5:"Samuel Adekugbe",6:"Richie Laryea",7:"Derek Cornelius",8:"Moïse Bombito",9:"Kamal Miller",10:"Stephen Eustáquio",11:"Ismaël Koné",12:"Jonathan Osorio",14:"Jacob Shaffelburg",15:"Mathieu Choinière",16:"Niko Sigur",17:"Tajon Buchanan",18:"Liam Millar",19:"Cyle Larin",20:"Jonathan David" },
  CIV: { 2:"Yahia Fofana",3:"Ghislain Konan",4:"Wilfried Singo",5:"Odilon Kossounou",6:"Evan Ndicka",7:"Willy Boly",8:"Emmanuel Agbadou",9:"Ousmane Diomandé",10:"Franck Kessié",11:"Seko Fofana",12:"Ibrahim Sangaré",14:"Jean-Philippe Gbamin",15:"Amad Diallo",16:"Sébastien Haller",17:"Simon Adingra",18:"Yan Diomande",19:"Evann Guessand",20:"Oumar Diakité" },
  COD: { 2:"Lionel Mpasi",3:"Aaron Wan-Bissaka",4:"Axel Tuanzebe",5:"Arthur Masuaku",6:"Chancel Mbemba",7:"Joris Kayembe",8:"Charles Pickel",9:"Ngal'ayel Mukau",10:"Edo Kayembe",11:"Samuel Moutoussamy",12:"Noah Sadiki",14:"Théo Bongonda",15:"Meschack Elia",16:"Yoane Wissa",17:"Brian Cipenga",18:"Fiston Mayele",19:"Cédric Bakambu",20:"Nathanaël Mbuku" },
  COL: { 2:"Camilo Vargas",3:"David Ospina",4:"Dávinson Sánchez",5:"Yerry Mina",6:"Daniel Muñoz",7:"Johan Mojica",8:"Jhon Lucumí",9:"Santiago Arias",10:"Jefferson Lerma",11:"Kevin Castaño",12:"Richard Ríos",14:"James Rodríguez",15:"Juan Fernando Quintero",16:"Jorge Carrascal",17:"Jhon Arias",18:"Jhon Córdoba",19:"Luis Suárez",20:"Luis Díaz" },
  CPV: { 2:"Vozinha",3:"Logan Costa",4:"Pico",5:"Diney",6:"Steven Moreira",7:"Wagner Pina",8:"João Paulo",9:"Yannick Semedo",10:"Kevin Pina",11:"Patrick Andrade",12:"Jamiro Monteiro",14:"Deroy Duarte",15:"Garry Rodrigues",16:"Jovane Cabral",17:"Ryan Mendes",18:"Dailon Livramento",19:"Willy Semedo",20:"Bebé" },
  CRO: { 2:"Dominik Livaković",3:"Duje Ćaleta-Car",4:"Joško Gvardiol",5:"Josip Stanišić",6:"Luka Vušković",7:"Josip Šutalo",8:"Kristijan Jakić",9:"Luka Modrić",10:"Mateo Kovačić",11:"Martin Baturina",12:"Lovro Majer",14:"Mario Pašalić",15:"Petar Sučić",16:"Ivan Perišić",17:"Marco Pašalić",18:"Ante Budimir",19:"Andrej Kramarić",20:"Franjo Ivanović" },
  CUW: { 2:"Eloy Room",3:"Armando Obispo",4:"Sherel Floranus",5:"Jurien Gaari",6:"Joshua Brenet",7:"Roshon van Eijma",8:"Shurandy Sambo",9:"Livano Comenencia",10:"Godfried Roemeratoe",11:"Juninho Bacuna",12:"Leandro Bacuna",14:"Tahith Chong",15:"Kenji Gorré",16:"Jearl Margaritha",17:"Jürgen Locadia",18:"Jeremy Antonisse",19:"Gervane Kastaneer",20:"Sontje Hansen" },
  CZE: { 2:"Matěj Kovář",3:"Jindřich Staněk",4:"Ladislav Krejčí",5:"Vladimír Coufal",6:"Jaroslav Zelený",7:"Tomáš Holeš",8:"David Zima",9:"Michal Sadílek",10:"Lukáš Provod",11:"Lukáš Červ",12:"Tomáš Souček",14:"Pavel Šulc",15:"Matěj Vydra",16:"Vasil Kušej",17:"Tomáš Chorý",18:"Václav Černý",19:"Adam Hložek",20:"Patrik Schick" },
  ECU: { 2:"Hernán Galíndez",3:"Gonzalo Valle",4:"Piero Hincapié",5:"Pervis Estupiñán",6:"Willian Pacho",7:"Ángelo Preciado",8:"Joel Ordóñez",9:"Moisés Caicedo",10:"Alan Franco",11:"Kendry Páez",12:"Pedro Vite",14:"John Yeboah",15:"Leonardo Campana",16:"Gonzalo Plata",17:"Nilson Angulo",18:"Alan Minda",19:"Kevin Rodríguez",20:"Enner Valencia" },
  EGY: { 2:"Mohamed El Shenawy",3:"Mohamed Hany",4:"Mohamed Hamdy",5:"Yasser Ibrahim",6:"Khaled Sobhi",7:"Ramy Rabia",8:"Hossam Abdelmaguid",9:"Ahmed Fatouh",10:"Marwan Attia",11:"Zizo",12:"Hamdy Fathy",14:"Mohamed Lasheen",15:"Emam Ashour",16:"Osama Faisal",17:"Mohamed Salah",18:"Mostafa Mohamed",19:"Trezeguet",20:"Omar Marmoush" },
  ENG: { 2:"Jordan Pickford",3:"John Stones",4:"Marc Guéhi",5:"Ezri Konsa",6:"Trent Alexander-Arnold",7:"Reece James",8:"Dan Burn",9:"Jordan Henderson",10:"Declan Rice",11:"Jude Bellingham",12:"Cole Palmer",14:"Morgan Rogers",15:"Anthony Gordon",16:"Phil Foden",17:"Bukayo Saka",18:"Harry Kane",19:"Marcus Rashford",20:"Ollie Watkins" },
  ESP: { 2:"Unai Simón",3:"Robin Le Normand",4:"Aymeric Laporte",5:"Dean Huijsen",6:"Pedro Porro",7:"Dani Carvajal",8:"Marc Cucurella",9:"Martín Zubimendi",10:"Rodri",11:"Pedri",12:"Fabián Ruiz",14:"Mikel Merino",15:"Lamine Yamal",16:"Dani Olmo",17:"Nico Williams",18:"Ferran Torres",19:"Álvaro Morata",20:"Mikel Oyarzabal" },
  FRA: { 2:"Mike Maignan",3:"Théo Hernández",4:"William Saliba",5:"Jules Koundé",6:"Ibrahima Konaté",7:"Dayot Upamecano",8:"Lucas Digne",9:"Aurélien Tchouaméni",10:"Eduardo Camavinga",11:"Manu Koné",12:"Adrien Rabiot",14:"Michael Olise",15:"Ousmane Dembélé",16:"Bradley Barcola",17:"Désiré Doué",18:"Kingsley Coman",19:"Hugo Ekitike",20:"Kylian Mbappé" },
  GER: { 2:"Marc-André ter Stegen",3:"Jonathan Tah",4:"David Raum",5:"Nico Schlotterbeck",6:"Antonio Rüdiger",7:"Waldemar Anton",8:"Ridle Baku",9:"Maximilian Mittelstädt",10:"Joshua Kimmich",11:"Florian Wirtz",12:"Felix Nmecha",14:"Leon Goretzka",15:"Jamal Musiala",16:"Serge Gnabry",17:"Kai Havertz",18:"Leroy Sané",19:"Karim Adeyemi",20:"Nick Woltemade" },
  GHA: { 2:"Lawrence Ati-Zigi",3:"Tariq Lamptey",4:"Mohammed Salisu",5:"Alidu Seidu",6:"Alexander Djiku",7:"Gideon Mensah",8:"Caleb Yirenkyi",9:"Abdul Fatawu Issahaku",10:"Thomas Partey",11:"Salis Abdul Samed",12:"Kamaldeen Sulemana",14:"Mohammed Kudus",15:"Iñaki Williams",16:"Jordan Ayew",17:"André Ayew",18:"Joseph Paintsil",19:"Osman Bukari",20:"Antoine Semenyo" },
  HAI: { 2:"Johny Placide",3:"Carlens Arcus",4:"Martin Experience",5:"Jean-Kévin Duverne",6:"Ricardo Adé",7:"Duke Lacroix",8:"Garven Metusala",9:"Hannes Delcroix",10:"Leverton Pierre",11:"Danley Jean Jacques",12:"Jean-Ricner Bellegarde",14:"Christopher Attys",15:"Derrick Etienne Jr.",16:"Josué Casimir",17:"Ruben Providence",18:"Duckens Nazon",19:"Louicius Deedson",20:"Frantzdy Pierrot" },
  IRN: { 2:"Alireza Beiranvand",3:"Morteza Pouraliganji",4:"Ehsan Hajsafi",5:"Milad Mohammadi",6:"Shojae Khalilzadeh",7:"Ramin Rezaeian",8:"Hossein Kanaani",9:"Sadegh Moharrami",10:"Saleh Hardani",11:"Saeed Ezatolahi",12:"Saman Ghoddos",14:"Omid Noorafkan",15:"Roozbeh Cheshmi",16:"Mohammad Mohebi",17:"Sardar Azmoun",18:"Mehdi Taremi",19:"Alireza Jahanbakhsh",20:"Ali Gholizadeh" },
  IRQ: { 2:"Jalal Hassan",3:"Rebin Sulaka",4:"Hussein Ali",5:"Akam Hashem",6:"Merchas Doski",7:"Zaid Tahseen",8:"Manaf Younis",9:"Zidane Iqbal",10:"Amir Al-Ammari",11:"Ibrahim Bayesh",12:"Ali Jasim",14:"Youssef Amyn",15:"Aymen Hussein",16:"Marko Farji",17:"Osama Rashid",18:"Ali Al-Hamadi",19:"Aymen Hussein",20:"Mohanad Ali" },
  JOR: { 2:"Yazeed Abulaila",3:"Ihsan Haddad",4:"Mohammad Abu Hashish",5:"Yazan Al-Arab",6:"Abdallah Nasib",7:"Saleem Obaid",8:"Mohammad Abualnadi",9:"Ibrahim Saadeh",10:"Nizar Al-Rashdan",11:"Noor Al-Rawabdeh",12:"Mohannad Abu Taha",14:"Amer Jamous",15:"Mousa Al-Taamari",16:"Yazan Al-Naimat",17:"Mahmoud Al-Mardi",18:"Ali Olwan",19:"Mohammad Abu Zrayq",20:"Ibrahim Sabra" },
  JPN: { 2:"Zion Suzuki",3:"Hiroki Mochizuki",4:"Ayumu Seko",5:"Junnosuke Suzuki",6:"Shogo Taniguchi",7:"Tsuyoshi Watanabe",8:"Kaishu Sano",9:"Yuki Soma",10:"Ao Tanaka",11:"Daichi Kamada",12:"Takefusa Kubo",14:"Ritsu Doan",15:"Keito Nakamura",16:"Takumi Minamino",17:"Shuto Machino",18:"Junya Ito",19:"Koki Ogawa",20:"Ayase Ueda" },
  KOR: { 2:"Jo Hyeon-woo",3:"Kim Seung-gyu",4:"Kim Min-jae",5:"Cho Yu-min",6:"Seol Young-woo",7:"Lee Han-beom",8:"Lee Tae-seok",9:"Lee Myung-jae",10:"Lee Jae-sung",11:"Hwang In-beom",12:"Lee Kang-in",14:"Paik Seung-ho",15:"Jens Castrop",16:"Lee Dong-gyeong",17:"Cho Gue-sung",18:"Son Heung-min",19:"Hwang Hee-chan",20:"Oh Hyeon-gyu" },
  KSA: { 2:"Nawaf Alaqidi",3:"Abdulrahman Al-Sanbi",4:"Saud Abdulhamid",5:"Nawaf Boushal",6:"Jihad Thakri",7:"Moteb Al-Harbi",8:"Hassan Altambakti",9:"Musab Aljuwayr",10:"Ziyad Aljohani",11:"Abdullah Alkhaibari",12:"Nasser Aldawsari",14:"Saleh Abu Alshamat",15:"Marwan Alsahafi",16:"Salem Aldawsari",17:"Abdulrahman Al-Aboud",18:"Feras Albrikan",19:"Saleh Alshehri",20:"Abdullah Al-Hamdan" },
  MAR: { 2:"Yassine Bounou",3:"Munir El Kajoui",4:"Achraf Hakimi",5:"Noussair Mazraoui",6:"Nayef Aguerd",7:"Romain Saïss",8:"Jawad El Yamiq",9:"Adam Masina",10:"Sofyan Amrabat",11:"Azzedine Ounahi",12:"Eliesse Ben Seghir",14:"Bilal El Khannouss",15:"Ismael Saibari",16:"Youssef En-Nesyri",17:"Abde Ezzalzouli",18:"Soufiane Rahimi",19:"Brahim Díaz",20:"Ayoub El Kaabi" },
  MEX: { 2:"Luis Malagón",3:"Johan Vásquez",4:"Jorge Sánchez",5:"César Montes",6:"Jesús Gallardo",7:"Israel Reyes",8:"Diego Lainez",9:"Carlos Rodríguez",10:"Edson Álvarez",11:"Orbelín Pineda",12:"Marcel Ruiz",14:"Érick Sánchez",15:"Hirving Lozano",16:"Santiago Giménez",17:"Raúl Jiménez",18:"Alexis Vega",19:"Roberto Alvarado",20:"César Huerta" },
  NED: { 2:"Bart Verbruggen",3:"Virgil van Dijk",4:"Micky van de Ven",5:"Jurriën Timber",6:"Denzel Dumfries",7:"Nathan Aké",8:"Jeremie Frimpong",9:"Jan Paul van Hecke",10:"Tijjani Reijnders",11:"Ryan Gravenberch",12:"Teun Koopmeiners",14:"Frenkie de Jong",15:"Xavi Simons",16:"Justin Kluivert",17:"Memphis Depay",18:"Donyell Malen",19:"Wout Weghorst",20:"Cody Gakpo" },
  NOR: { 2:"Ørjan Nyland",3:"Julian Ryerson",4:"Leo Østigård",5:"Kristoffer Ajer",6:"Marcus Holmgren Pedersen",7:"David Møller Wolfe",8:"Torbjørn Heggem",9:"Morten Thorsby",10:"Martin Ødegaard",11:"Sander Berge",12:"Andreas Schjelderup",14:"Patrick Berg",15:"Erling Haaland",16:"Alexander Sørloth",17:"Aron Dønnum",18:"Jørgen Strand Larsen",19:"Antonio Nusa",20:"Oscar Bobb" },
  NZL: { 2:"Max Crocombe",3:"Alex Paulsen",4:"Michael Boxall",5:"Liberato Cacace",6:"Tim Payne",7:"Tyler Bindon",8:"Francis de Vries",9:"Finn Surman",10:"Joe Bell",11:"Sarpreet Singh",12:"Ryan Thomas",14:"Matthew Garbett",15:"Marko Stamenić",16:"Ben Old",17:"Chris Wood",18:"Elijah Just",19:"Callum McCowatt",20:"Kosta Barbarouses" },
  PAN: { 2:"Orlando Mosquera",3:"Luis Mejía",4:"Fidel Escobar",5:"Andrés Andrade",6:"Michael Amir Murillo",7:"Eric Davis",8:"José Córdoba",9:"César Blackman",10:"Cristian Martínez",11:"Aníbal Godoy",12:"Adalberto Carrasquilla",14:"Édgar Bárcenas",15:"Carlos Harvey",16:"Ismael Díaz",17:"José Fajardo",18:"Cecilio Waterman",19:"José Luis Rodríguez",20:"Alberto Quintero" },
  PAR: { 2:"Roberto Fernández",3:"Orlando Gill",4:"Gustavo Gómez",5:"Fabián Balbuena",6:"Juan José Cáceres",7:"Omar Alderete",8:"Junior Alonso",9:"Mathías Villasanti",10:"Diego Gómez",11:"Damián Bobadilla",12:"Andrés Cubas",14:"Matías Galarza Fonda",15:"Julio Enciso",16:"Alejandro Romero Gamarra",17:"Miguel Almirón",18:"Ramón Sosa",19:"Ángel Romero",20:"Antonio Sanabria" },
  POR: { 2:"Diogo Costa",3:"José Sá",4:"Rúben Dias",5:"João Cancelo",6:"Diogo Dalot",7:"Nuno Mendes",8:"Gonçalo Inácio",9:"Bernardo Silva",10:"Bruno Fernandes",11:"Rúben Neves",12:"Vitinha",14:"João Neves",15:"Cristiano Ronaldo",16:"Francisco Trincão",17:"João Félix",18:"Gonçalo Ramos",19:"Pedro Neto",20:"Rafael Leão" },
  QAT: { 2:"Meshaal Barsham",3:"Sultan Al Brake",4:"Lucas Mendes",5:"Homam Ahmed",6:"Boualem Khoukhi",7:"Pedro Miguel",8:"Tarek Salman",9:"Mohamed Al-Mannai",10:"Karim Boudiaf",11:"Assim Madibo",12:"Ahmed Fatehi",14:"Mohammed Waad",15:"Abdulaziz Hatem",16:"Hassan Al-Haydos",17:"Edmilson Junior",18:"Akram Afif",19:"Ahmed Al Ganehi",20:"Almoez Ali" },
  RSA: { 2:"Ronwen Williams",3:"Sipho Chaine",4:"Aubrey Modiba",5:"Samukele Kabini",6:"Mbekezeli Mbokazi",7:"Khulumani Ndamane",8:"Siyabonga Ngezana",9:"Khuliso Mudau",10:"Nkosinathi Sibisi",11:"Teboho Mokoena",12:"Thalente Mbatha",14:"Bathusi Aubaas",15:"Yaya Sithole",16:"Sipho Mbule",17:"Lyle Foster",18:"Iqraam Rayners",19:"Mohau Nkota",20:"Oswin Appollis" },
  SCO: { 2:"Angus Gunn",3:"Jack Hendry",4:"Kieran Tierney",5:"Aaron Hickey",6:"Andrew Robertson",7:"Scott McKenna",8:"John Souttar",9:"Anthony Ralston",10:"Grant Hanley",11:"Scott McTominay",12:"Billy Gilmour",14:"Lewis Ferguson",15:"Ryan Christie",16:"Kenny McLean",17:"John McGinn",18:"Lyndon Dykes",19:"Che Adams",20:"Ben Doak" },
  SEN: { 2:"Édouard Mendy",3:"Yehvann Diouf",4:"Moussa Niakhaté",5:"Abdoulaye Seck",6:"Ismail Jakobs",7:"El Hadji Malick Diouf",8:"Kalidou Koulibaly",9:"Idrissa Gana Gueye",10:"Pape Matar Sarr",11:"Pape Gueye",12:"Habib Diarra",14:"Lamine Camara",15:"Sadio Mané",16:"Ismaïla Sarr",17:"Boulaye Dia",18:"Iliman Ndiaye",19:"Nicolas Jackson",20:"Krépin Diatta" },
  SUI: { 2:"Gregor Kobel",3:"Yvon Mvogo",4:"Manuel Akanji",5:"Ricardo Rodríguez",6:"Nico Elvedi",7:"Aurèle Amenda",8:"Silvan Widmer",9:"Granit Xhaka",10:"Denis Zakaria",11:"Remo Freuler",12:"Fabian Rieder",14:"Ardon Jashari",15:"Johan Manzambi",16:"Michel Aebischer",17:"Breel Embolo",18:"Rubén Vargas",19:"Dan Ndoye",20:"Zeki Amdouni" },
  SWE: { 2:"Victor Johansson",3:"Isak Hien",4:"Gabriel Gudmundsson",5:"Emil Holm",6:"Victor Nilsson Lindelöf",7:"Gustaf Lagerbielke",8:"Lucas Bergvall",9:"Hugo Larsson",10:"Jesper Karlström",11:"Yasin Ayari",12:"Mattias Svanberg",14:"Daniel Svensson",15:"Ken Sema",16:"Roony Bardghji",17:"Dejan Kulusevski",18:"Anthony Elanga",19:"Alexander Isak",20:"Viktor Gyökeres" },
  TUN: { 2:"Bechir Ben Said",3:"Aymen Dahmen",4:"Yan Valery",5:"Montassar Talbi",6:"Yassine Meriah",7:"Ali Abdi",8:"Dylan Bronn",9:"Ellyes Skhiri",10:"Aïssa Laïdouni",11:"Ferjani Sassi",12:"Mohamed Ali Ben Romdhane",14:"Hannibal Mejbri",15:"Elias Achouri",16:"Elias Saad",17:"Hazem Mastouri",18:"Ismael Gharbi",19:"Sayfallah Ltaief",20:"Naïm Sliti" },
  TUR: { 2:"Uğurcan Çakır",3:"Mert Müldür",4:"Zeki Çelik",5:"Abdülkerim Bardakcı",6:"Çağlar Söyüncü",7:"Merih Demiral",8:"Ferdi Kadıoğlu",9:"Kaan Ayhan",10:"İsmail Yüksek",11:"Hakan Çalhanoğlu",12:"Orkun Kökçü",14:"Arda Güler",15:"İrfan Can Kahveci",16:"Yunus Akgün",17:"Can Uzun",18:"Barış Alper Yılmaz",19:"Kerem Aktürkoğlu",20:"Kenan Yıldız" },
  URU: { 2:"Sergio Rochet",3:"Santiago Mele",4:"Ronald Araújo",5:"José María Giménez",6:"Sebastián Cáceres",7:"Mathías Olivera",8:"Guillermo Varela",9:"Nahitan Nández",10:"Federico Valverde",11:"Giorgian De Arrascaeta",12:"Rodrigo Bentancur",14:"Manuel Ugarte",15:"Nicolás de la Cruz",16:"Maxi Araújo",17:"Darwin Núñez",18:"Federico Viñas",19:"Rodrigo Aguirre",20:"Facundo Pellistri" },
  USA: { 2:"Matt Freese",3:"Chris Richards",4:"Tim Ream",5:"Mark McKenzie",6:"Alex Freeman",7:"Antonee Robinson",8:"Tyler Adams",9:"Tanner Tessmann",10:"Weston McKennie",11:"Christian Roldan",12:"Timothy Weah",14:"Diego Luna",15:"Malik Tillman",16:"Christian Pulisic",17:"Brenden Aaronson",18:"Ricardo Pepi",19:"Haji Wright",20:"Folarin Balogun" },
  UZB: { 2:"Utkir Yusupov",3:"Farrukh Sayfiev",4:"Sherzod Nasrullaev",5:"Umar Eshmurodov",6:"Husniddin Aliqulov",7:"Rustamjon Ashurmatov",8:"Khojiakbar Alijonov",9:"Abdukodir Khusanov",10:"Odiljon Hamrobekov",11:"Otabek Shukurov",12:"Jamshid Iskanderov",14:"Azizbek Turgunboev",15:"Khojimat Erkinov",16:"Eldor Shomurodov",17:"Oston Urunov",18:"Jaloliddin Masharipov",19:"Igor Sergeev",20:"Abbosbek Fayzullaev" },
};
