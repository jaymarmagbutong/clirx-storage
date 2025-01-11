export default (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ error: 'An internal server error occurred' });
};
