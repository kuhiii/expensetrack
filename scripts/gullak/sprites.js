// Palette + sprites as text grids. One character per art pixel; ' ' or '.' = transparent.
// Fills only — the renderer adds the 1px dark outline around each silhouette.

const PALETTE = {
  e: '#3D2C38', // eyes, mouths, fine detail (same tone as the outline)
  w: '#FFF6E9', // cream
  W: '#EADCC6', // cream shade
  s: '#F4CBA3', // skin
  S: '#DEA67F', // skin shade
  b: '#F59FA6', // blush
  r: '#DB7672', // maroon / roof tile
  R: '#B65A5C', // maroon dark
  n: '#C99A6E', // wood
  N: '#946A4C', // wood dark
  y: '#F8D873', // coin
  Y: '#DDB24C', // coin shade
  o: '#FFF4C2', // coin highlight
  c: '#EFB791', // clay
  C: '#D69573', // clay shade
  d: '#B8765B', // clay dark
  g: '#AAD290', // sage / tulsi
  G: '#80AF6C', // sage dark
  m: '#A7E0CF', // mint
  M: '#7DC0AE', // mint dark
  u: '#A3C6EB', // blue
  U: '#7799C7', // blue dark
  l: '#CDBBE6', // lavender
  L: '#A896C9', // lavender dark
  p: '#F6AAC5', // pink
  P: '#DB87A5', // pink dark
  k: '#DCC792', // khaki
  K: '#BBA56F', // khaki dark
  f: '#8E5D46', // coffee
  F: '#6C4333', // coffee dark
  t: '#F5B27C', // orange (cat, kumhar's cloth)
  T: '#DA8F5B', // orange dark
  a: '#C4C1D3', // grey (pigeon, moustache)
  A: '#9A97B0', // grey dark
  h: '#6A4A3C', // hair
  q: '#E3AD83', // skin mid
  Q: '#C98F67', // skin mid shade
  z: '#C98E68', // skin deep
  Z: '#A9714F', // skin deep shade
};

const OUTLINE = '#3D2C38';

const S = {};

// ---- characters -------------------------------------------------------------

S.munim = [
  '     rrrr     ',
  '    rrrrrr    ',
  '   RRRRRRRR   ',
  '   qqqqqqqq   ',
  '  qqqqqqqqqq  ',
  '  qqqqqqqqqq  ',
  '  qqeqqqqeqq  ',
  '  qqeqqqqeqq  ',
  '  qbaaaaaabq  ',
  '   aqqqqqQa   ',
  '    nwwwwn    ',
  '  qqnwwwwnqq  ',
  '    nwwwwn    ',
  '    ww  ww    ',
  '    NN  NN    ',
];

S.sorter = [
  '    mmmmmm    ',
  '   mmmmmmmm   ',
  '   MMMMMMMMMMM',
  '   ssssssss   ',
  '  ssssssssss  ',
  '  ssssssssss  ',
  '  ssessssess  ',
  '  ssessssess  ',
  '  sbsseessbs  ',
  '   sssssSSs   ',
  '    wmmmmw  yy',
  '  sswmmmmwssoY',
  '    wMmmMw    ',
  '    ss  ss    ',
  '    NN  NN    ',
];

S.catcher = [
  '     uuuu     ',
  '    uuuuuu    ',
  '  UUUUUUUUUU  ',
  '   zzzzzzzz   ',
  '  zzzzzzzzzz  ',
  '  zzzzzzzzzz  ',
  '  zzezzzzezz  ',
  '  zzezzzzezz  ',
  '  zbzzeezzbz  ',
  '   zzzzzZZz   ',
  '    uwwwwu    ',
  '  nNnNnNnNnN  ',
  '  NnnnnnnnnN  ',
  '   NNNNNNNN   ',
  '    uu  uu    ',
  '    NN  NN    ',
];

S.kumhar = [
  '    tttttt    ',
  '   tttttttt   ',
  '   TTTTTTTTtt ',
  '   zzzzzzzz T ',
  '  zzzzzzzzzz  ',
  '  zzzzzzzzzz  ',
  '  zzezzzzezz  ',
  '  zzezzzzezz  ',
  '  zbzzeezzbz  ',
  '   zzzzzZZz   ',
  '    wccccw    ',
  '  zzwcddcwzz  ',
  '    ccCCcc    ',
  '    zz  zz    ',
  '    NN  NN    ',
];

S.chowkidar = [
  '     kkkk     ',
  '    kkykkk    ',
  '  KKKKKKKKKK  ',
  '   qqqqqqqq   ',
  '  qqqqqqqqqq n',
  '  qqqqqqqqqq n',
  '  qqeqqqqeqq n',
  '  qqeqqqqeqq n',
  '  qbhhhhhhbq n',
  '   hqqqqqQh  n',
  '    kkkkkk   n',
  '  qqkkyykkqq n',
  '    KKKKKK   n',
  '    kk  kk   n',
  '    NN  NN   n',
];

S.cat = [
  ' t          t ',
  ' tt        tt ',
  ' ttttTttTtttt ',
  'tttttttttttttt',
  'ttteetttteettt',
  'ttbtttppttttbt',
  'tttttttttttttt',
  ' tttttttttttT ',
  '  wwTTTTTTww  ',
];

S.pigeon = [
  '  aaaa  ',
  ' aaaaaa ',
  ' aeaaea ',
  ' aaPPaa ',
  ' llmmll ',
  'aaaaaaaa',
  'aAAAAAAa',
  ' aaaaaa ',
  '  P  P  ',
];

// ---- objects ----------------------------------------------------------------

S.coin = [
  '  yyyy  ',
  ' yooyyy ',
  'yooyyyYy',
  'yoyyyyYy',
  'yyyyyyYy',
  'yyyyyYYy',
  ' yyYYYy ',
  '  yyyy  ',
];

S.coinPile = [
  '       yy       ',
  '     yyooyy     ',
  '   yyyyooyyyy   ',
  '  yyoyyyyyyYyy  ',
  ' yyyyyyYyyoyyyy ',
  'yyoyyyyyyyyyyYyy',
  'YyyyYYyyyYyyyYYY',
];

S.pot = [
  '   dddddd   ',
  '  dccccccd  ',
  '   cccccc   ',
  '  cccccccc  ',
  ' cwccccccCc ',
  'ccwcccccccCC',
  'ccwcccccccCC',
  'cccccccccCCC',
  ' cccccccCCC ',
  '  ccccCCCC  ',
  '   CCCCCC   ',
];

S.tulsi = [
  '    g  g    ',
  '   gGggGgg  ',
  '  ggGggggGg ',
  '   gGgggGg  ',
  '    gGGg    ',
  '     GG     ',
  '  dddddddd  ',
  '  cccccccc  ',
  '   ccccCC   ',
  '   cccCCC   ',
  '    CCCC    ',
];

S.mug = [
  '  e   e  ',
  '   e   e ',
  ' wwwwww  ',
  ' ffffff  ',
  ' wwwwwwww',
  ' wwwwwww w',
  ' wwwwwwww',
  ' WwwwwwW ',
  '  WWWWW  ',
];

S.icedCoffee = [
  '      p ',
  '     p  ',
  ' uuuupu ',
  ' uwwfwu ',
  ' ufwwfu ',
  ' uffffu ',
  ' uffffu ',
  ' uFffFu ',
  '  uuuu  ',
];

S.desk = [
  'nnnnnnnnnnnnnnnnnnnnnn',
  'nwnnnnnnnnnnnnnnnnnnnn',
  'nnnnnnnnnnnnnnnnnnnnnn',
  'NNNNNNNNNNNNNNNNNNNNNN',
  'NN                  NN',
  'NN                  NN',
];

S.ledger = [
  'RwwwwwRwwwwwR',
  'RweeewReeewwR',
  'RwwwwwRwwwwwR',
  'RweewwRweeewR',
  'RRRRRRRRRRRRR',
];

S.chest = [
  ' NNNNNNNNNNNNNN ',
  'NnnnnnnnnnnnnnnN',
  'NnwnnnnnnnnnnnnN',
  'NyyyyyyyyyyyyyyN',
  'NnnnnnnyynnnnnnN',
  'NnnnnnnYYnnnnnnN',
  'NnnnnnnnnnnnnnnN',
  'NNNNNNNNNNNNNNNN',
];

S.wheel = [
  '   nnnnnn   ',
  ' nnnnccnnnn ',
  'nnnncCCcnnnn',
  ' nnnnnnnnnn ',
  '   NNNNNN   ',
  '    NNNN    ',
  '  NNNNNNNN  ',
]

S.ladder = [
  'N    N',
  'NNNNNN',
  'N    N',
  'N    N',
  'NNNNNN',
  'N    N',
  'N    N',
  'NNNNNN',
  'N    N',
  'N    N',
  'NNNNNN',
  'N    N',
];

S.gullak = [
  '         rr         ',
  '       rreerr       ',
  '     rrrrrrrrrr     ',
  '   rrRrrRrrRrrRrr   ',
  ' RRRRRRRRRRRRRRRRRR ',
  '  cccccccccccccccC  ',
  '  ccwwccccccccccCC  ',
  '  ccwwcccccdddccCC  ',
  '  cccccccccddddcCC  ',
  '  ccccccccdddddcCC  ',
  '  CCCCCCCCCCCCCCCC  ',
]

// ---- props & the bigger pot -----------------------------------------------------

S.pot16 = [
  '    dddddddd    ',
  '   dccccccccd   ',
  '    cccccccc    ',
  '   cccccccccc   ',
  '  cccccccccccC  ',
  ' ccwcccccccccCC ',
  ' ccwcccccccccCC ',
  'cccwcccccccccCCC',
  'ccccccccccccCCCC',
  'ccccccccccccCCCC',
  ' cccccccccccCCC ',
  ' ccccccccccCCCC ',
  '  ccccccccCCCC  ',
  '   ccccccCCCC   ',
  '    CCCCCCCC    ',
];

// 5x5 emblems painted on a pot's belly, in cream
S.emblems = {
  rent: ['   w   ', '  www  ', ' wwwww ', 'wwwwwww', ' ww ww ', ' ww ww ', ' wwwww '],
  food: [' w w w ', '       ', 'wwwwwww', 'wwwwwww', ' wwwww ', '  www  ', '       '],
  shopping: ['  w w  ', ' w   w ', 'wwwwwww', 'wwwwwww', 'wwwwwww', 'wwwwwww', 'wwwwwww'],
  groceries: ['  ww   ', '   ww  ', '  www  ', ' wwwww ', ' wwwww ', '  www  ', '   w   '],
  transport: ['  www  ', ' wwwww ', 'wwwwwww', 'w w w w', 'wwwwwww', ' w   w ', '       '],
  hobbies: ['   w   ', '  www  ', 'wwwwwww', ' wwwww ', '  www  ', ' ww ww ', ' w   w '],
}

S.rug = [
  ' w w w w w w w w w w w w w w w ',
  'pppppppppppppppppppppppppppppppp',
  'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
  'llllllllllllllllllllllllllllllll',
  'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
  'pppppppppppppppppppppppppppppppp',
  'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
  'llllllllllllllllllllllllllllllll',
  'wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww',
  'pppppppppppppppppppppppppppppppp',
  ' w w w w w w w w w w w w w w w ',
];

S.sack = [
  '    yyy     ',
  '   kkykk    ',
  '  kKkkkKk   ',
  '  kkkkkkk   ',
  ' kkkkkkkkk  ',
  'kkkkkkkkkkK ',
  'kkkkkkkkkKK ',
  'kkkkkkkkKKK ',
  ' kkkkkkKKK  ',
  '  KKKKKKK   ',
];

S.chowki = [
  'nnnnnnnnnnnnnnnn',
  'nwnnnnnnnnnnnnnn',
  'NNNNNNNNNNNNNNNN',
  'NN            NN',
  'NN            NN',
];

S.chaura = [
  '  wwwwwwwwwwww  ',
  ' wccccccccccccw ',
  ' wccCccccccCccw ',
  ' wccccccccccccw ',
  ' CCCCCCCCCCCCCC ',
  ' CCCCCCCCCCCCCC ',
];

S.shelf = [
  'NNNNNNNNNNNNNNNNNN',
  'NrurmryrlrurNNNNNN',
  'NrurmryrlrurNNNNNN',
  'NNNNNNNNNNNNNNNNNN',
  'NlrurrmurryNNNNNNN',
  'NlrurrmurryNNNNNNN',
  'NNNNNNNNNNNNNNNNNN',
];

S.filterCoffee = [
  '  aaaa  ',
  ' affffa ',
  ' aAaaAa ',
  ' aaaaaa ',
  'aaaaaaaa',
  'aAaaaaAa',
  ' AAAAAA ',
];

S.books = [
  'rrrrrrrrrr',
  'RwwwwwwwwR',
  'uuuuuuuuu ',
  'UwwwwwwwU ',
  ' mmmmmmmmm',
  ' MwwwwwwwM',
];

S.stool = [
  'nnnnnnnnnn',
  'NNNNNNNNNN',
  'N        N',
  'N        N',
];

module.exports = { PALETTE, OUTLINE, S };
