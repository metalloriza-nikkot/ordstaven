// @ts-check
// Provsidan för textgrammatiken: översikten (textprov.html) eller en form i en egen ram (?form=…).
if (new URLSearchParams(location.search).has('form')) import('./ram.js');
else import('./sida.js');
