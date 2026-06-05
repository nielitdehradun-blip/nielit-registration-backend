const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const nodemailer = require("nodemailer");
const ImageKit = require("imagekit");

const Register = require("./models/Register");
const path = require("path");
dotenv.config();

const app = express();

/* ==========================
   MIDDLEWARE
========================== */

app.use(cors());

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true,
    })
);

app.use((req, res, next) => {
    console.log(
        `${req.method} ${req.url}`
    );
    next();
});

/* ==========================
   MONGODB
========================== */

mongoose
    .connect(process.env.MONGO_URI)
    .then(() =>
        console.log("✅ MongoDB Connected")
    )
    .catch((err) =>
        console.log(
            "❌ Mongo Error:",
            err.message
        )
    );


const coursePDFs = {
    "CCC": path.join(__dirname, "course-pdfs", "CCC-Syllabus.pdf"),

    "O Level": path.join(
        __dirname,
        "course-pdfs",
        "O-level-Syllabus.pdf"
    ),

    "A Level": path.join(
        __dirname,
        "course-pdfs",
        "A-Level.pdf"
    ),

    "B Level": path.join(
        __dirname,
        "course-pdfs",
        "B-Level.pdf"
    ),

    "PMKVY": path.join(
        __dirname,
        "course-pdfs",
        "PMKVY.pdf"
    ),
};
/* ==========================
IMAGEKIT
========================== */

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});
/* ==========================
   GET STUDENTS
========================== */

/* ==========================
   GET STUDENTS
========================== */

app.get("/api/students", async (req, res) => {
    try {

        const { name, id, date } = req.query;

        let filter = {};

        // Name Search
        if (name && name.trim()) {
            filter.name = {
                $regex: name.trim(),
                $options: "i",
            };
        }

        // Student ID Search
        if (id && id.trim()) {
            filter.studentId = id.trim();
        }

        // Date Search
        if (date) {

            const start = new Date(date);
            start.setHours(0, 0, 0, 0);

            const end = new Date(date);
            end.setHours(23, 59, 59, 999);

            filter.createdAt = {
                $gte: start,
                $lte: end,
            };
        }

        const students = await Register
            .find(filter)
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: students.length,
            students,
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});


/* ==========================
   MULTER
========================== */

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
});

/* ==========================
   EMAIL
========================== */
const transporter =
    nodemailer.createTransport({
        service: "gmail",

        auth: {
            user:
                process.env.EMAIL_USER,

            pass:
                process.env.EMAIL_PASS,
        },
    });

/* ==========================
   HOME
========================== */

app.get("/", (req, res) => {
    res.send(
        "NIELIT Registration API Running 🚀"
    );
});


/* ==========================
   REGISTER
========================== */

app.post(
    "/api/register",
    upload.single("photo"),
    async (req, res) => {
        try {
            console.log(
                "========== NEW REQUEST =========="
            );

            console.log("BODY:");
            console.dir(req.body, {
                depth: null,
            });

            console.log("FILE:");
            console.dir(req.file, {
                depth: null,
            });

            if (!req.body) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Request body missing",
                });
            }

            const {
                name,
                age,
                gender,
                city,
                state,
                address,
                qualification,
                phone,
                parentPhone,
                whatsapp,
                email,
                category,
                course,
            } = req.body;

            if (
                !name ||
                !phone ||
                !email ||
                !course
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Required fields missing",
                });
            }

            /* Duplicate Check */

            const existing =
                await Register.findOne({
                    email: email.toLowerCase().trim(),
                });

            if (existing) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Email already registered",
                });
            }

            if (existing) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Student already exists",
                });
            }

            /* ImageKit Upload */

            let photoUrl = "";

            if (req.file) {

                const uploadedImage =
                    await imagekit.upload({
                        file: req.file.buffer,
                        fileName:
                            `student-${Date.now()}.png`,
                        folder:
                            "/nielit-students",
                    });

                photoUrl =
                    uploadedImage.url;
            }

            // Checking the last id given to the student

            /* ==========================
   GENERATE STUDENT ID
========================== */

            const lastStudent = await Register
                .findOne({
                    studentId: {
                        $exists: true,
                        $ne: null,
                    },
                })
                .sort({
                    studentId: -1,
                });

            let nextNumber = 1;

            if (lastStudent?.studentId) {

                const currentNumber =
                    parseInt(
                        lastStudent.studentId.replace(
                            "NDSC",
                            ""
                        ),
                        10
                    );

                if (!isNaN(currentNumber)) {
                    nextNumber =
                        currentNumber + 1;
                }
            }

            const studentId =
                `NDSC${String(
                    nextNumber
                ).padStart(6, "0")}`;

            console.log(
                "Generated Student ID:",
                studentId
            );
            /* Save Student */

            const student =
                await Register.create({
                    studentId,
                    name,
                    age,
                    gender,
                    city,
                    state,
                    address,
                    qualification,
                    phone,
                    parentPhone,
                    whatsapp,
                    email,
                    category,
                    course,
                    photo: photoUrl,
                });

            /* Student Email */

            /* Student Email */

            const selectedPDF = coursePDFs[course];

            console.log("Selected PDF:", selectedPDF);

            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,

                    to: email,

                    subject: "NIELIT Registration",

                    html: `
    <div style="
        font-family: Arial, sans-serif;
        max-width: 700px;
        margin: auto;
        padding: 20px;
        color: #333;
    ">

        <h2 style="color:#0056b3;">
            NIELIT Dehradun
        </h2>

        <p>
            Hello
            <strong style="color:#0056b3;">
                ${name}
            </strong>,
        </p>

        <p>
            Your enquiry has been successfully registered with us for the course
            <strong style="color:#28a745;">
                ${course}
            </strong>.
        </p>

        <p>
            Thank you for visiting NIELIT Dehradun.
        </p>

        <p>
            Your Enquiry ID is:
            <strong style="
                color:#dc3545;
                font-size:16px;
            ">
                ${studentId}
            </strong>
        </p>

        <p>
            Please find the course curriculum attached with this email.
        </p>

        

        <br>

        <p>
            Thank you.
        </p>

        <p>
            Regards,<br>
            <strong>
                NIELIT Dehradun
            </strong>
        </p>

    </div>
`,

                    attachments: selectedPDF
                        ? [
                            {
                                filename: path.basename(selectedPDF),
                                path: selectedPDF,
                            },
                        ]
                        : [],
                });
            } catch (mailErr) {
                console.log(
                    "Student Mail Error:",
                    mailErr.message
                );
            }

            /* Admin Email */

            try {
                if (
                    process.env.ADMIN_EMAIL
                ) {
                    await transporter.sendMail({
                        from:
                            process.env.EMAIL_USER,

                        to:
                            process.env.ADMIN_EMAIL,

                        subject:
                            "New Inquiry",

                        html: `
              <h3>
                New Inquiry
              </h3>

              <p>
                Name:
                ${name}
              </p>

              <p>
                Phone:
                ${phone}
              </p>

              <p>
                Course:
                ${course}
              </p>
            `,
                    });
                }
            } catch (mailErr) {
                console.log(
                    "Admin Mail Error:",
                    mailErr.message
                );
            }

            return res.status(201).json({
                success: true,
                message:
                    "Registration Successful",
                student,
            });
        } catch (error) {
            console.error(
                "REGISTER ERROR:"
            );
            console.error(error);

            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }
);

/* ==========================
   GLOBAL ERROR
========================== */

app.use(
    (err, req, res, next) => {
        console.error(
            "GLOBAL ERROR:"
        );
        console.error(err);

        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
);

/* ==========================
   SERVER
========================== */

const PORT =
    process.env.PORT || 5500;

app.listen(PORT, () => {
    console.log(
        "ImageKit Endpoint:",
        process.env.IMAGEKIT_URL_ENDPOINT
    );

    console.log(
        `🚀 Server running on port ${PORT}`
    );
});