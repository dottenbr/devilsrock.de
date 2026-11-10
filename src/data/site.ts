// Shared links and content data. Edit here, not in the pages.

export const links = {
    facebook: 'https://www.facebook.com/profile.php?id=100076197633953',
    instagram: 'https://www.instagram.com/devils_rock_trail_hennweiler',
    komootCollection: 'https://www.komoot.com/de-de/collection/4016133/-devils-rock-trails',
    community: '/community/',
    paypal: 'https://www.paypal.com/donate/?hosted_button_id=ER7GHR4A3NDCC&source=qr',
    github: 'https://github.com/dottenbr/devilsrock.de',
    impressum: 'https://fchennweiler.de/impressum/',
    club: 'https://fchennweiler.de/',
    vg: 'https://kirner-land.de',
    village: 'https://hennweiler.de',
    membershipForm: 'https://fchennweiler.de/wp-content/uploads/2026/05/FCVH_Beitrittserklaerung_neu.pdf',
    membershipMail: 'mailto:fcv09h@web.de?subject=Beitrittserkl%C3%A4rung%20Devils%20Rock%20Trails',
};

// Main navigation. "Schaden melden" is rendered separately as a button.
export const mainNav = [
    { href: '/#trail', label: 'Trails' },
    { href: '/#community', label: 'Community' },
    { href: '/crew/', label: 'Crew' },
    { href: '/ctf2027/', label: 'CTF 2027' },
];

export const tours = [
    {
        name: 'Downhill',
        start: 'ab Parkplatz Hennweiler',
        km: '5,25',
        hm: '140',
        komoot: 'https://www.komoot.com/de-de/tour/2468852361',
        gpx: '/assets/gpx/2026-03-31_2468852361_Devils Rock Trails Downhill vom Parkplatz Hennweiler.gpx',
    },
    {
        name: 'XC',
        start: 'ab Parkplatz Bruschied',
        km: '6,05',
        hm: '120',
        komoot: 'https://www.komoot.com/de-de/tour/2832575483',
        gpx: '/assets/gpx/2026-03-31_2832575483_Devils Rock Trails XC vom Parkplatz Bruschied.gpx',
    },
    {
        name: 'Komplett',
        start: 'ab Parkplatz Hennweiler',
        km: '11',
        hm: '250',
        komoot: 'https://www.komoot.com/de-de/tour/2855728185',
        gpx: '/assets/gpx/2026-03-31_2855728185_Devils Rock Trails Komplett vom Parkplatz Hennweiler.gpx',
    },
];

export const team = [
    { name: 'Julian Fritz', role: 'Vorsitzender Radsport', email: 'julian@devilsrock.de', photo: 'julian-fritz' },
    { name: 'Florian Bauer', role: 'Jugendtrainer Radsport', email: 'flo@devilsrock.de', photo: 'florian-bauer' },
    { name: 'Dominik Ottenbreit', role: 'Koordination Trailbau', email: 'dom@devilsrock.de', photo: 'dominik-ottenbreit' },
] as const;
