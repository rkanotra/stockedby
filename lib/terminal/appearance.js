export const APPEARANCE_KEY = 'stockedby-appearance';
export const themeBootstrap = `try{document.documentElement.dataset.stockedbyTheme=localStorage.getItem('${APPEARANCE_KEY}')==='light'?'light':'dark'}catch{document.documentElement.dataset.stockedbyTheme='dark'}`;
