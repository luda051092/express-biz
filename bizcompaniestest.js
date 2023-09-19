process.env.NODE_ENV = "test";

const request = require("supertest");

const app = require("../app");
const db = require('../db');

let it = { code: "it", industry: "IT" };
let apple = { code: "apple", name: "Apple", description: "apple company", industries: ["it"] };
let invoice = { comp_code: "apple", amt: 20 };

beforeEach(async function (done) {
    //init test data
    await db.query('DELETE FROM companies');
    await db.query('DELETE FROM industries');

    await db.query('INSERT INTO industries VALUES ($1 , $2)', [it.code, it.industry]);
    await db.query('INSERT INTO companies VALUES ($1 , $2 , $3)', [apple.code, apple.name, apple.description]);
    await db.query('INSERT INTO companies_industries VALUES ($1 , $2)', [apple.code, it.code]);
    await db.query('INSERT INTO invoices (comp_code , amt) VALUES ($1 , $2)', [invoice.comp_code, invoice.amt]);

    done();
});

afterEach(async function (done) {
    // clear data
    await db.query('DELETE FROM companies'); 
    await db.query('DELETE FROM industries');

    done();
});


afterAll(async function () {
    await db.end();
});



// get companies. returns `{companies: [{"code": "apple" , "name": "Apple"}]}`

describe("GET /companies", function () {
    test("Gets a list of companies", async function () {
        const resp = await request(app).get(`/companies`);
        expect(resp.statusCode).toBe(200);

        expect(resp.body).toEqual({ companies: [{ code: apple.code, name: apple.name }] });

    });
});

// GET /companies/[code]. Returns data about one company: `{company: {code, name, description, industries:[{code , industry} , ...] invoices: [id, ...]}}`

describe("GET /companies/:code", function () {
    test("Gets a single company", async function () {
        const resp = await request(app).get(`/companies/${apple.code}`);
        expect(resp.statusCode).toBe(200);

        expect(resp.body).toEqual({
            company: {
                code: apple.code,
                name: apple.name, 
                description: apple.description,
                industries: [
                    it
                ],
                invoices: [
                    {
                        "add_date": (new Date((new Date()).toDateString())).toISOString(),
                        "amt": invoice.amt,
                        "comp_code": invoice.comp_code,
                        "id": expect.any(Number),
                        "paid": false,
                        "paid_date": null
                    }
                ]
            }
        });
    });
    test("Responds with 404 if cannot find company", async function () {
        const resp = await request(app).get(`/companies/0`);
        expect(resp.statusCode).toBe404;
    });
});

// POST /companies. Create company from the data, 
// return `{company: {code, name, description}}`

describe("POST /companies", function () {
    test("Creates a new company", async function () {
        const resp = await request(app)
            .post(`/companies`)
            .send({
                name: "Microsoft", 
                description: "Microsoft Inc.", 
                indu_codes: ["it"]
            });
        expect(resp.statusCode).toBe(201);
        expect(resp.body).toEqual({
            "company": {
                code: "microsoft",
                name: "Microsoft",
                description: "Microsoft Inc.",
                indu_codes: ["it"]
            }
        });
    });


    test("Creates a new company, no name", async function () {
        const resp = await request(app)
            .post(`/companies`)
            .send({
                name: ""
            });
        expect(resp.statusCode).toBe(400);
        expect(resp.body).toEqual({
            "error": {
                message: "name required",
                status: 400
            },
            "message": "name is required"
        });
    });
});

// PUT /companies/[name]: update company. Return `{company: {code, name, description}}`

describe("PUT /companies/:name", function () {
    test("Updates a single company", async function () {
        const resp = await request(app)
            .put(`/companies/${apple.code}`)
            .send({
                name: "Apple Updated",
                description: "Description Updated",
                indu_codes: ["it"]
            });
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual({
            company: {
                code: apple.code,
                name: "Apple Updated",
                description: "Description Updated",
                indu_codes: ["it"]
            }
        });
    });

    test("update a single company, no name", async function () {
        const resp = await request(app)
            .put(`/companies/${apple.code}`)
            .send({
                name: "",
                description: "Description Updated"
            });
        expect(resp.statusCode).toBe(400);
        expect(resp.body).toEqual({
            "error": {
                message: "name is required",
                status: 400
            },
            "message": "name is required"
        });
    });

    test("Responds with 404 if id invalid", async function () {
        const resp = await request(app).patch(`/companies/0`);
        expect(resp.statusCode).toBe(404);
    });
});

// DELETE /companies/[name]. Delete company, return `{status: "deleted"}`

describe("DELETE /companies/:name", function () {
    test("Deletes a single company", async function () {
        const resp = await request(app).delete(`/companies/${apple.code}`);
        expect(resp.statusCode).toBe(200);
        expect(resp.body).toEqual({ status: "deleted" });

        //returns 404 if already deleted
        const resp1 = await request(app).delete(`/companies/${apple.code}`)
        expect(resp1.statusCode).toBe404;
    });
});
