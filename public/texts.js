// Visitor-facing wording for the certificate, the remembrances and the chat controls.
// Kept in one pure module so tests can check it matches what was approved.

export const CERTIFICATE = {
  nav: 'Certificate',
  title: 'Certificate',
  locked: (opened, total) => `Open all ${total} jars and finish the quiz to earn your certificate. Jars opened: ${opened} of ${total}.`,
  offer: 'Well done, apprentice. You have opened every jar and answered every question. Shall I write your name in my book?',
  nameLabel: 'Your name for the certificate',
  write: 'Write my name',
  download: 'Download as image',
  heading: 'Certificate of the Apprentice Apothecary',
  certifies: 'This certifies that',
  body: "has opened all eight jars of the Apothecary's Ghost, finished the quiz, and remembered the people who came before.",
  footer: 'This is a keepsake, not a qualification. History, not medical advice.',
  signature: 'Ambrose Quill, a made-up ghost',
  filename: 'apprentice-apothecary-certificate.png',
};

export const REMEMBER = {
  heading: 'Leave a remembrance',
  help: 'Write a short line about someone you miss, and place a candle for them.',
  whoLabel: 'Who do you remember?',
  lineLabel: 'Your line',
  place: 'Place a candle',
  remove: 'Remove',
  privacy: 'Your remembrance stays only in this browser. It is never sent anywhere, and you can remove it at any time.',
  blocked: 'Your browser is not keeping this, so it will vanish when you close the page.',
};

export const CHAT_UI = {
  nav: 'Ask the ghost',
  title: 'Ask the ghost',
  label: 'Your question',
  placeholder: 'Ask Ambrose about the old remedies',
  ask: 'Ask',
  thinking: 'Ambrose is thinking…',
  voiceOff: 'Voice: off',
  voiceOn: 'Voice: on',
  banner: 'History, not medical advice.',
};
