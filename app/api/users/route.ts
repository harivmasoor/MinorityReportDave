import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
import {getServerSession, Session} from "next-auth";
import { RowDataPacket } from 'mysql2';


config();
interface DbConfig {
    host: string;
    user: string;
    password: string;
    database: string;
    port: number;
    ssl: {
        ca: string;
    };
}
const databaseName = "crimebot";

const caCert = `-----BEGIN CERTIFICATE-----
MIIDrzCCApegAwIBAgIQCDvgVpBCRrGhdWrJWZHHSjANBgkqhkiG9w0BAQUFADBh
MQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3
d3cuZGlnaWNlcnQuY29tMSAwHgYDVQQDExdEaWdpQ2VydCBHbG9iYWwgUm9vdCBD
QTAeFw0wNjExMTAwMDAwMDBaFw0zMTExMTAwMDAwMDBaMGExCzAJBgNVBAYTAlVT
MRUwEwYDVQQKEwxEaWdpQ2VydCBJbmMxGTAXBgNVBAsTEHd3dy5kaWdpY2VydC5j
b20xIDAeBgNVBAMTF0RpZ2lDZXJ0IEdsb2JhbCBSb290IENBMIIBIjANBgkqhkiG
9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4jvhEXLeqKTTo1eqUKKPC3eQyaKl7hLOllsB
CSDMAZOnTjC3U/dDxGkAV53ijSLdhwZAAIEJzs4bg7/fzTtxRuLWZscFs3YnFo97
nh6Vfe63SKMI2tavegw5BmV/Sl0fvBf4q77uKNd0f3p4mVmFaG5cIzJLv07A6Fpt
43C/dxC//AH2hdmoRBBYMql1GNXRor5H4idq9Joz+EkIYIvUX7Q6hL+hqkpMfT7P
T19sdl6gSzeRntwi5m3OFBqOasv+zbMUZBfHWymeMr/y7vrTC0LUq7dBMtoM1O/4
gdW7jVg/tRvoSSiicNoxBN33shbyTApOB6jtSj1etX+jkMOvJwIDAQABo2MwYTAO
BgNVHQ8BAf8EBAMCAYYwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQUA95QNVbR
TLtm8KPiGxvDl7I90VUwHwYDVR0jBBgwFoAUA95QNVbRTLtm8KPiGxvDl7I90VUw
DQYJKoZIhvcNAQEFBQADggEBAMucN6pIExIK+t1EnE9SsPTfrgT1eXkIoyQY/Esr
hMAtudXH/vTBH1jLuG2cenTnmCmrEbXjcKChzUyImZOMkXDiqw8cvpOp/2PV5Adg
06O/nVsJ8dWO41P0jmP6P6fbtGbfYmbW0W5BjfIttep3Sp+dWOIrWcBAI+0tKIJF
PnlUkiaY4IBIqDfv8NZ5YBberOgOzW6sRBc4L0na4UU+Krk2U886UAb3LujEV0ls
YSEY1QSteDwsOoBrp+uvFRTp2InBuThs4pFsiv9kuXclVzDAGySj4dzp30d8tbQk
CAUw7C29C79Fv1C5qfPrmAESrciIxpg0X40KPMbp1ZWVbd4=
-----END CERTIFICATE-----
`;  

const dbConfig: DbConfig = {
    host: "crime-bot.mysql.database.azure.com",
    user: "hari",
    password: "crimebot12!", 
    database: databaseName,
    port: 3306,
    ssl: {
        ca: caCert,
    },
};



  
  // Assuming sesh.user is of type User
export async function createUser(email: string | undefined, name: string | undefined, image: string | undefined) {
    console.log('POST request');
    try {
        // Ensure email is present
        if (!email) {
            throw new Error('Email not found in session');
        }

        const connection = await createConnection(dbConfig);
        try {
            // First, check if the user already exists
            const [users] = await connection.execute<RowDataPacket[]>(
              `SELECT *
               FROM users
               WHERE email = ?`,
              [email]
            );

            // Now you can safely check users.length because TypeScript knows users is an array
            if (users.length === 0) {
                // User does not exist, add them with default tokens
                await connection.execute(
                  `INSERT INTO users (name, email, google_image_url, token_remaining, signup_date)
                   VALUES (?, ?, ?, 5, NOW())`,
                  [name, email, image]
                );
                console.log('User added with default tokens');
            } else {
                // User exists, update their tokens
                await connection.execute(
                  `UPDATE users
                   SET token_remaining = token_remaining + 5
                   WHERE email = ?`,
                  [email]
                );
                console.log('Tokens updated for existing user');
            }
        } finally {
            await connection.end();
        }
    } catch (error) {
        console.error(error);
        throw error
    }
}



export async function GET(req: Request): Promise<Response> {
    console.log('GET request');
    try {
        const sesh = await getServerSession(); // Make sure to pass `req` if your session function needs it
        
        let email = sesh?.user?.email;
        if (!email) {
            return new Response(JSON.stringify({ error: 'User not authenticated' }), {
                status: 401, // Unauthorized
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const connection = await createConnection(dbConfig);
        console.log('Connection established')
        const [users] = await connection.execute<RowDataPacket[]>(
            `SELECT token_remaining FROM users WHERE email = ?`,
            [email]
        );

        await connection.end();

        if (users.length > 0) {
            return new Response(JSON.stringify(users[0]), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        } else {
            return new Response(JSON.stringify({ error: 'User not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: 'Failed to fetch user data' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}



export async function PUT(req: Request) {
    try {
        const sesh = await getServerSession(); 
        let email = null; // Default to null, adjust as needed

        if (sesh && sesh.user && sesh.user.email) {
            email = sesh.user.email;
        } else {
            // If session or user email is not found, return an error response
            return new Response(JSON.stringify({ error: 'User not authenticated or email not found' }), {
                status: 401, // Unauthorized
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const connection = await createConnection(dbConfig);
        
        // First, fetch the current tokens remaining for the user
        const [rows] = await connection.execute<RowDataPacket[]>(
            `SELECT token_remaining FROM users WHERE email = ?`,
            [email]
        );

        if (rows.length > 0 && rows[0].token_remaining > 0) {
            // If tokens are available, subtract one and update the database
            await connection.execute(
                `UPDATE users SET token_remaining = token_remaining - 1 WHERE email = ? AND token_remaining > 0`,
                [email]
            );
            console.log('1 token subtracted successfully');
            await connection.end();
            return new Response(JSON.stringify({ message: '1 token subtracted successfully' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        } else {
            // If no tokens are remaining, return an error response
            await connection.end();
            return new Response(JSON.stringify({ error: 'No tokens remaining to subtract' }), {
                status: 400, // Bad Request
                headers: { 'Content-Type': 'application/json' },
            });
        }
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: 'Failed to subtract tokens' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
