import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { rdsGetMultiple } from "@sr24/db/redis";

const accountId = process.env.CF_ACCOUNT_ID || "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const secret = process.env.R2_SECRET_ACCESS_KEY || "";
const bucket = process.env.R2_BUCKET_NAME || "";

const r2 = new S3Client({
	region: "auto",
	endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
	credentials: { accessKeyId, secretAccessKey: secret },
});

export async function updateR2Storage(): Promise<void> {
	const versions: string[] = await rdsGetMultiple("", [
		"static_airports:version",
		"static_firs:version",
		"static_tracons:version",
		"static_airlines:version",
		"static_aircrafts:version",
	]);
	const manifest = {
		airportsVersion: versions[0],
		firsVersion: versions[1],
		traconsVersion: versions[2],
		airlinesVersion: versions[3],
		aircraftsVersion: versions[4],
	};

	await uploadManifestToR2(manifest);

	const datas = await rdsGetMultiple("", [
		"static_airports:all",
		"static_firs:all",
		"static_tracons:all",
		"static_airlines:all",
		"static_aircrafts:all",
	]);
	await uploadDataToR2(`airports_${manifest.airportsVersion}.json`, JSON.stringify(datas[0]));
	await uploadDataToR2(`firs_${manifest.firsVersion}.json`, JSON.stringify(datas[1]));
	await uploadDataToR2(`tracons_${manifest.traconsVersion}.json`, JSON.stringify(datas[2]));
	await uploadDataToR2(`airlines_${manifest.airlinesVersion}.json`, JSON.stringify(datas[3]));
	await uploadDataToR2(`aircrafts_${manifest.aircraftsVersion}.json`, JSON.stringify(datas[4]));
	console.log("✅ R2 storage update completed!");
}

async function uploadDataToR2(key: string, body: Buffer | Uint8Array | Blob | string) {
	return await r2.send(
		new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			Body: body,
		}),
	);
}

async function uploadManifestToR2(manifest: object) {
	const manifestJson = JSON.stringify(manifest);
	return await uploadDataToR2("manifest.json", manifestJson);
}
