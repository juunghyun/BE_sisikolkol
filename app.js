const express = require('express')
let cors = require('cors')
const port = 8080
const db = require('./mysql');

const crypto = require('crypto');
const app = express()
const conn = db.init();

db.connect(conn);
//cors처리, 저 cors()안에다가 cors조건을 걸 수 있음.
app.use(cors());
//api 연결 시 body등 열수있도록 하기
app.use(express.json());

const userID = 1;
const query = `SELECT * FROM user WHERE userID = ${userID}`;


conn.query(query, (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Query result:', rows);
    }

});
// 기본 주소인 '/'으로 요청이 들어오면 callback이므로 res.send~ 가 실행됩니다. 즉 아래의 listen을 통해 받은 요청의 안에 req가 담아져오고, res를 통해 내가 보내주면 되는듯
app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.post('/login', (req, res) => {
    const { loginID, loginPW } = req.body;

    //password hashing
    const hashedPassword = crypto.createHash('sha256').update(loginPW).digest('hex');


    const query = 'SELECT userID, userNickname, userName, auth FROM user WHERE loginID = ? AND loginPW = ?';
    //아래 query의 loginPW는 회원가입 api 작성 후 위의 hashedPassword로 변경
    conn.query(query, [loginID, loginPW], (err, rows) => {
        if (err) {
            console.error('Error:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            if (rows.length > 0) {
                const userInfo = {
                    userID: rows[0].userID,
                    userNickname: rows[0].userNickname,
                    userName: rows[0].userName,
                    auth: rows[0].auth
                };
                res.json(userInfo);
            } else {
                res.status(400).send("user not found");
            }
        }
    });
});

//가게 정보 불러오기 api
app.get('/bar/coordinate', async (req, res) => {
    try {
        // 데이터베이스 연결 초기화
        const conn = db.init();

        // 데이터베이스 연결
        db.connect(conn);

        // bar 테이블에서 barID가 1부터 10까지인 데이터 가져오기
        const barQuery = `
      SELECT 
        barID, barName, barAddress, barType, barLatitude, barLongitude, barTag, barDetail, barCorkPrice
      FROM bar
      WHERE barID BETWEEN 1 AND 10
    `;

        // reservation 테이블에서 해당 barID와 동일한 컬럼의 reservationTime 가져오기
        const reservationQuery = `
      SELECT 
        barID, reservationTime
      FROM reservation
      WHERE barID BETWEEN 1 AND 10
    `;

        // bar_review 테이블에서 해당 barID와 동일한 컬럼의 데이터 가져오기
        const reviewQuery = `
      SELECT 
        barID, userNickname, barStar, barReviewDetail
      FROM bar_review
      WHERE barID BETWEEN 1 AND 10
    `;

        // 쿼리 실행
        const [barRows] = await conn.promise().query(barQuery);
        const [reservationRows] = await conn.promise().query(reservationQuery);
        const [reviewRows] = await conn.promise().query(reviewQuery);

        // 연결 종료
        conn.end();

        // 데이터를 원하는 구조로 정리
        const barList = barRows.map(row => {
            const reservations = reservationRows
                .filter(reservation => reservation.barID === row.barID)
                .map(reservation => reservation.reservationTime);

            const reviews = reviewRows
                .filter(review => review.barID === row.barID)
                .map(review => ({
                    userNickname: review.userNickname,
                    barReviewDetail: review.barReviewDetail,
                    barStar: review.barStar,
                }));

            return {
                barID: row.barID,
                barName: row.barName,
                barAddress: row.barAddress,
                barType: row.barType,
                barLatitude: row.barLatitude,
                barLongitude: row.barLongitude,
                barTag: row.barTag,
                barDetail: row.barDetail,
                barCorkPrice: row.barCorkPrice,
                barReservation: reservations,
                barReview: reviews,
            };
        });

        // 클라이언트에 응답 보내기
        res.json(barList);
    } catch (error) {
        console.error('에러:', error);
        res.status(500).json({ error: '내부 서버 오류' });
    }
});


app.get('/dog', (req, res) => {
    res.json({a: 30, b:40});
})

//파라미터를 이용한 방식
// app.get('/dog/:user', (req, res) => {
//     const q = req.params
//     console.log(q); //{"user" : "user변수값"}
//     res.json({a: 30, b:40, c:q.user});
// })

//쿼리를 이용한 방식
app.get('/dog/:user', (req, res) => {
    const q = req.query
    console.log(q);
    res.json({a:q.q, b:q.name, c:q.age, d:"기모띠"});
})

//몇번 포트에 대해 열려있다고 알려주기 위한 console.log. 여기서 3000번 포트가 열려있다.
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})