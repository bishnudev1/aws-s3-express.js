import * as formidable from 'formidable';
import { Upload } from "@aws-sdk/lib-storage";
import { S3Client } from "@aws-sdk/client-s3";
import { Transform } from 'stream';

interface FormData {
    [key: string]: any;
}

const accessKeyId: string = process.env.AWS_ACCESS_KEY_ID || '';
const secretAccessKey: string = process.env.AWS_SECRET_ACCESS_KEY || '';
const region: string = process.env.S3_REGION || '';
const Bucket: string = process.env.S3_BUCKET || '';

const parsefile = async (req: any): Promise<FormData> => {
    return new Promise((resolve, reject) => {
        let options = {
            maxFileSize: 100 * 1024 * 1024, // 100 megabytes converted to bytes,
            allowEmptyFiles: false,
        };

        const form = new formidable.IncomingForm(options);

        // method accepts the request and a callback.
        form.parse(req, (err, fields, files) => {
            // console.log(fields, "====", files)
        });

        form.on('error', (error) => {
            reject(error.message);
        });

        form.on('data', (data) => {
            if (data.name === "complete") {
                // let statuscode = data.value['$metadata']?.httpStatusCode || 200;
                resolve(data.value);
            }
        });

        form.on('fileBegin', (formName, file) => {

            file.open = async function () {
                this._writeStream = new Transform({
                    transform(chunk, encoding, callback) {
                        callback(null, chunk);
                    },
                });

                this._writeStream.on('error', (e) => {
                    form.emit('error', e);
                });

                // upload to S3
                new Upload({
                    client: new S3Client({
                        credentials: {
                            accessKeyId,
                            secretAccessKey,
                        },
                        region,
                    }),
                    params: {
                        ACL: 'public-read',
                        Bucket,
                        Key: `${Date.now().toString()}-${this.originalFilename}`,
                        Body: this._writeStream,
                    },
                    tags: [], // optional tags
                    queueSize: 4, // optional concurrency configuration
                    partSize: 1024 * 1024 * 5, // optional size of each part, in bytes, at least 5MB
                    leavePartsOnError: false, // optional manually handle dropped parts
                })
                    .done()
                    .then((data) => {
                        form.emit('data', { name: "complete", value: data });
                    })
                    .catch((err) => {
                        form.emit('error', err);
                    });
            };

            file.end = function (cb) {
                this._writeStream.on('finish', () => {
                    this.emit('end');
                    cb();
                });
                this._writeStream.end();
            };
        });
    });
};

export = parsefile;
