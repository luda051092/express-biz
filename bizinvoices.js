const express = require('express');
const router = new express.Router();


const ExpressError = require('../expressError');
const db = require('../db');

// Return info on invoices: like {invoices: [{id, comp_code}, ..]}

router.get('/', async (req, res, next) => {
    try {
        const results = await db.query('SELECT id , comp_code FROM invoices');

       return res.json({ invoices: results.rows}); 
    } catch (err) {
        next(err);
    }
});

// Returns obj on given invoice. Return 404 if invoice cannot be found. 
// Returns {invoice: {id, amt, paid, add_date, paid_date, company: {code, name, description}}}

router.get('/:id', async (req, res, next) => {
    try {
        const results = await db.query(`
        SELECT
            id, amt, paid, add_date, paid_date, comp_code, name , description
        FROM
            invoices INNER JOIN companies ON invoices.comp_code = companies.code
        WHERE 
            id = $1`, [req.params.id]);
        
        if (results.rows.length === 0) {
            throw new ExpressError(`invoice with id ${req.params.id} can not be found`, 404);

        }

        const { id, amt, paid, add_date, paid_date } = results.rows[0];
        const { comp_code, name, description } = results.rows[0];

        return res.json({
            invoice: {
                id, amt, paid, add_date, paid_date,
                company: { code: comp_code, name, description }
            }
        });
    } catch (err) {
        next(err);
    }
});

// Add invoice. Returns {invoice: {id, comp_code, amt, paid, add_date, paid_date}}

router.post('/', async (req, res, next) => {
    try {

        if (req.body.comp_code === undefined ||
            req.body.amt === undefined ||
            req.body.comp_code.length === 0) {
            throw new ExpressError('comp_code and amt are required', 400);    
        }

        const amt = Number(req.body.amt);

        if (amt === NaN || amt <= 0) {
            throw new ExpressError('amt must be greater than 0', 400);
        }

        const company = await db.query('SELECT code FROM companies WHERE code = $1', [req.body.comp_code]);

        if (company.rows.length === 0) {
            throw new ExpressError(`company with code ${req.body.comp_code} can not be found`, 400);

        }

        const results = await db.query(
            `
            INSERT INTO invoices
                (comp_code , amt)
            VALUES
                ($1 , $2)
            RETURNING id, comp_code, amt, paid, add_date, paid_date` , 
            [req.body.comp_code, req.body.amt]);
        
        return res.status(201).json({ invoice: results.rows[0] });

    } catch (err) {
        next(err);
    }
});

//updates invoice. Returns 404 if invoice cannot be found. Returns {invoice: {id, comp_code, amt, paid, add_date, paid_date}}

router.put('/:id', async (req, res, next) => {
    try {

        if (req.body.amt === undefined){
            throw new ExpressError('amt is required', 400);
        }
        const amt = Number(req.body.amt);

        if (amt === NaN || amt <= 0) {
            throw new ExpressError('amt must be greater than 0', 400);
        }

        const results = await db.query(
            `
            UPDATE invoices
            SET
                amt = $2
            WHERE
                id = $1
            RETURNING id, comp_code, amt, paid, add_date, paid_date` , 
            [req.params.id, req.body.amt]);
        if (results.rows.length === 0) {
            throw new ExpressError(`invoice with id ${req.params.id} can not be found`, 404);

        }

        if (req.body.paid !== undefined) {
            if (req.body.paid === true || req.body.paid === false) {
                
                const paid = req.body.paid === true ? true : false;
                const paidDate = paid ? (new Date()).toISOString().substr(0, 10) : null;

                const results = await db.query(`
                UPDATE invoices
                SET
                    paid = $2,
                    paid_date = $3
                WHERE
                    id = $1
                RETURNING id, comp_code, amt, paid, add_date, paid_date` ,
                    [req.params.id, paid , paidDate]);
                
                return res.json({ invoice: results.rows[0] });


            }
        }

        return res.json({ invoice: results.rows[0] });
    } catch (err) {
        next(err);
    }
});

// Deletes invoice. Returns 404 if invoice cannot be found. Returns: {status: "deleted"}

router.delete('/:id', async (req, res, next) => {
    try {
        const results = await db.query(
            `DELETE FROM invoices WHERE id = $1
             RETURNING id`,
            [req.params.id]);
        
        if (results.rows.length === 0) {
            throw new ExpressError(`invoice with id ${req.params.id} can not be found`, 404);

        }

        return res.json({ status: "deleted" });
    } catch (err) {
        next(err);
    }
});


module.exports = router;