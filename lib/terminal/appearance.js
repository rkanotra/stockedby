export const APPEARANCE_KEY = 'stockedby-appearance';
export const themeBootstrap = `try{document.documentElement.dataset.stockedbyTheme=localStorage.getItem('${APPEARANCE_KEY}')==='dark'?'dark':'light'}catch{document.documentElement.dataset.stockedbyTheme='light'}`;
