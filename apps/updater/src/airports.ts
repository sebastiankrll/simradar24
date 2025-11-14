import axios from "axios";
import csvParser from "csv-parser";

interface Airport {
    id: string;
    ident: string;
    type: string;
    name: string;
    latitude_deg: string;
    longitude_deg: string;
    elevation_ft: string;
    continent: string;
    iso_country: string;
    iso_region: string;
    municipality: string;
    scheduled_service: string;
    icao_code: string;
    iata_code: string;
    gps_code: string;
    local_code: string;
    home_link: string;
    wikipedia_link: string;
    keywords: string;
}

const CSV_URL = 'https://ourairports.com/data/airports.csv'

export async function updateAirports(): Promise<void> {
    const response = await axios.get(CSV_URL, { responseType: 'stream' })
    const airports: Airport[] = []

    await new Promise((resolve, reject) => {
        response.data
            .pipe(csvParser())
            .on('data', (row: Airport) => airports.push(row))
            .on('end', () => resolve(airports))
            .on('error', (err: Error) => reject(err))
    })

    console.log(airports[0])
    // console.log(`Fetched ${airports.length} airports. Updating database...`)
}

// function updateDB() {
//     console.log(`[${new Date().toISOString()}] Starting airport update...`);

//     try {
//         const airports = await fetchAirports();
//         console.log(`Fetched ${airports.length} airports.`);

//         const client = await pool.connect();

//         try {
//             await client.query('BEGIN');
//             await client.query('TRUNCATE airports RESTART IDENTITY');

//             const insertQuery = `
//         INSERT INTO airports (
//           id, ident, type, name, latitude_deg, longitude_deg, elevation_ft,
//           continent, iso_country, iso_region, municipality, scheduled_service,
//           gps_code, iata_code, local_code, home_link, wikipedia_link, keywords
//         ) VALUES (
//           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
//         )
//       `;

//             for (const airport of airports) {
//                 await client.query(insertQuery, [
//                     airport.id,
//                     airport.ident,
//                     airport.type,
//                     airport.name,
//                     airport.latitude_deg || null,
//                     airport.longitude_deg || null,
//                     airport.elevation_ft || null,
//                     airport.continent,
//                     airport.iso_country,
//                     airport.iso_region,
//                     airport.municipality,
//                     airport.scheduled_service,
//                     airport.gps_code,
//                     airport.iata_code,
//                     airport.local_code,
//                     airport.home_link,
//                     airport.wikipedia_link,
//                     airport.keywords,
//                 ]);
//             }

//             await client.query('COMMIT');
//             console.log('Database updated successfully!');
//         } catch (err) {
//             await client.query('ROLLBACK');
//             console.error('Error inserting airports:', err);
//         } finally {
//             client.release();
//         }
//     } catch (err) {
//         console.error('Error fetching or updating airports:', err);
//     }
// }