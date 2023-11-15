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
      WHERE barID BETWEEN 433 AND 444
    `;

        // reservation 테이블에서 해당 barID와 동일한 컬럼의 reservationTime 가져오기
        const reservationQuery = `
      SELECT 
        barID, reservationTime
      FROM reservation
      WHERE barID BETWEEN 433 AND 444
    `;

        // bar_review 테이블에서 해당 barID와 동일한 컬럼의 데이터 가져오기
        const reviewQuery = `
      SELECT 
        barID, userNickname, barStar, barReviewDetail
      FROM bar_review
      WHERE barID BETWEEN 433 AND 444
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
                barLatitude: Number(row.barLatitude),
                barLongitude: Number(row.barLongitude),
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

//가게 이름 검색 api
app.get('/bar/search/:barname', async (req, res) => {
    try {
        // 요청에서 barname 파라미터 가져오기
        const barname = req.params.barname;

        // 데이터베이스 연결 초기화
        const conn = db.init();

        // 데이터베이스 연결
        db.connect(conn);

        // bar 테이블에서 해당 barname을 포함하는 가게들의 정보 가져오기
        const query = `
      SELECT 
        barID,
        barName,
        barAddress,
        barType,
        barLatitude,
        barLongitude,
        barDetail
      FROM bar
      WHERE barName LIKE ?
    `;

        // 쿼리 실행
        const [rows] = await conn.promise().query(query, [`%${barname}%`]);

        // 연결 종료
        conn.end();

        // 클라이언트에 응답 보내기
        if (rows.length > 0) {
            // 검색된 이름이 여러개라면 배열에 담아서 전송
            if (rows.length > 0) {
                const barsInfo = rows.map((row) => ({
                    barID: row.barID,
                    barName: row.barName,
                    barAddress: row.barAddress,
                    barType: row.barType,
                    barLatitude: Number(row.barLatitude),
                    barLongitude: Number(row.barLongitude),
                    barDetail: row.barDetail
                }));
                res.json(barsInfo);
            } else {
                // 검색된 이름이 하나라면 객체로 전송
                const barInfo = {
                    barID: rows[0].barID,
                    barName: rows[0].barName,
                    barAddress: rows[0].barAddress,
                    barType: rows[0].barType,
                    barLatitude: Number(rows[0].barLatitude),
                    barLongitude: Number(rows[0].barLongitude),
                    barDetail: rows[0].barDetail
                };
                res.json(barInfo);
            }
        } else {
            res.status(404).json({ error: '가게 정보를 찾을 수 없습니다.' });
        }
    } catch (error) {
        console.error('에러:', error);
        res.status(500).json({ error: '내부 서버 오류' });
    }
});

//가게 찜하기 api
app.post('/bar/bookmark/:barID', async (req, res) => {
    try {
        // 요청에서 barID와 userID 파라미터 가져오기
        const barID = req.params.barID;
        const userID = req.body.userID;

        // 데이터베이스 연결 초기화
        const conn = db.init();

        // 데이터베이스 연결
        db.connect(conn);

        // 해당 barID와 userID가 이미 찜한 목록에 있는지 확인하는 쿼리
        const checkFavorQuery = `
      SELECT COUNT(*) as count
      FROM bar_favor
      WHERE barID = ? AND userID = ?
    `;

        // 찜하기 추가 또는 삭제 쿼리
        let favorQuery = '';
        if ((await conn.promise().query(checkFavorQuery, [barID, userID]))[0][0].count > 0) {
            // 이미 찜한 목록에 있는 경우, 삭제 쿼리
            favorQuery = `
        DELETE FROM bar_favor
        WHERE barID = ? AND userID = ?
      `;
        } else {
            // 찜한 목록에 없는 경우, 추가 쿼리
            favorQuery = `
        INSERT INTO bar_favor (barID, userID)
        VALUES (?, ?)
      `;
        }

        // 쿼리 실행
        await conn.promise().query(favorQuery, [barID, userID]);

        // 연결 종료
        conn.end();

        // 클라이언트에 응답 보내기
        res.json({ message: '찜하기가 성공적으로 처리되었습니다.' });
    } catch (error) {
        console.error('에러:', error);
        res.status(500).json({ error: '내부 서버 오류' });
    }
});

//찜한 가게 목록 불러오기 api (배열로 barID 반환)
app.get('/bar/bookmark/:userID', async (req, res) => {
    try {
        // 요청에서 userID 파라미터 가져오기
        const userID = req.params.userID;

        // 데이터베이스 연결 초기화
        const conn = db.init();

        // 데이터베이스 연결
        db.connect(conn);

        // 해당 userID의 찜한 목록을 불러오는 쿼리
        const getBookmarkQuery = `
      SELECT barID
      FROM bar_favor
      WHERE userID = ?
    `;

        // 쿼리 실행
        const bookmarkResult = await conn.promise().query(getBookmarkQuery, [userID]);

        // 찜한 목록을 담을 배열
        const bookmarkList = bookmarkResult[0].map((row) => row.barID);

        // 연결 종료
        conn.end();

        // 클라이언트에 찜한 목록 응답 보내기
        res.json({ bookmarkList });
    } catch (error) {
        console.error('에러:', error);
        res.status(500).json({ error: '내부 서버 오류' });
    }
});

// 가게 리뷰하기 API
app.post('/bar/review/:barID', async (req, res) => {
    const { barID } = req.params;
    const { userNickname, barStar, barReviewDetail } = req.body;

    try {
        // 데이터베이스 연결 초기화
        const conn = db.init();

        // 데이터베이스 연결
        db.connect(conn);

        // 중복 리뷰 확인하는 쿼리
        const checkDuplicateReviewQuery = 'SELECT * FROM bar_review WHERE barID = ? AND userNickname = ?';

        // 중복 리뷰 확인
        const [duplicateReviews] = await conn.promise().query(checkDuplicateReviewQuery, [barID, userNickname]);

        // 중복된 리뷰가 있으면 에러 응답
        if (duplicateReviews.length > 0) {
            conn.end(); // 연결 종료
            return res.status(400).json({ error: '이미 존재하는 리뷰입니다' });
        }

        // 가게 리뷰 저장하는 쿼리
        const insertReviewQuery = 'INSERT INTO bar_review (barID, userNickname, barStar, barReviewDetail) VALUES (?, ?, ?, ?)';

        // 쿼리 실행
        await conn.promise().query(insertReviewQuery, [barID, userNickname, barStar, barReviewDetail]);

        conn.end(); // 연결 종료

        // 성공 응답
        res.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 리뷰한 가게 불러오기 API
app.get('/bar/review/:userNickname', async (req, res) => {
    const { userNickname } = req.params;

    try {
        // 데이터베이스 연결 초기화
        const conn = db.init();

        // 데이터베이스 연결
        db.connect(conn);

        // 리뷰한 가게 조회하는 쿼리
        const getReviewedBarsQuery = `
      SELECT br.barReviewID, br.barID, br.userNickname, br.barStar, br.barReviewDetail, b.barName
      FROM bar_review br
      INNER JOIN bar b ON br.barID = b.barID
      WHERE br.userNickname = ?
    `;

        // 쿼리 실행
        const [reviewedBars] = await conn.promise().query(getReviewedBarsQuery, [userNickname]);

        conn.end(); // 연결 종료

        // 클라이언트에 리뷰한 가게 목록 응답 보내기
        res.json({ reviewedBars });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 주류 정보 가져오기 api
app.get('/liquor/info', async (req, res) => {
    try {
        // 데이터베이스 연결 초기화
        const conn = db.init();

        // 데이터베이스 연결
        db.connect(conn);

        // liquor 테이블에서 liquorID가 1부터 10까지인 데이터 가져오기
        const query = `
      SELECT 
        liquorID, liquorType, liquorName, liquorPrice, liquorDetail
      FROM liquor
      WHERE liquorID BETWEEN 1 AND 10
    `;

        // 쿼리 실행
        const [rows] = await conn.promise().query(query);

        // 연결 종료
        conn.end();

        // 데이터를 원하는 구조로 정리
        const liquorList = rows.map(row => ({
            liquorID: row.liquorID,
            liquorType: row.liquorType,
            liquorName: row.liquorName,
            liquorPrice: row.liquorPrice,
            liquorDetail: row.liquorDetail,
        }));

        // 클라이언트에 응답 보내기
        res.json(liquorList);
    } catch (error) {
        console.error('에러:', error);
        res.status(500).json({ error: '내부 서버 오류' });
    }
});

// 주류 검색 api, 리뷰도 보내도록 설정.
app.get('/liquor/search/:liquorname', async (req, res) => {
    try {
        // 요청에서 liquorname 파라미터 가져오기
        const liquorname = req.params.liquorname;

        // 데이터베이스 연결 초기화
        const conn = db.init();

        // 데이터베이스 연결
        db.connect(conn);

        // liquor 테이블에서 해당 liquorname을 포함하는 주류들의 정보 가져오기
        const liquorQuery = `
      SELECT 
        liquorID,
        liquorName,
        liquorType,
        liquorPrice,
        liquorDetail
      FROM liquor
      WHERE liquorName LIKE ?
    `;

        // liquor_review 테이블에서 해당 liquorID의 리뷰 정보 가져오기
        const reviewQuery = `
      SELECT 
        liquorReviewID,
        userNickname,
        liquorID,
        liquorStar,
        liquorReviewDetail
      FROM liquor_review
      WHERE liquorID = ?
    `;

        // 쿼리 실행
        const [liquorRows] = await conn.promise().query(liquorQuery, [`%${liquorname}%`]);

        // 결과가 없을 경우 404 에러 응답
        if (liquorRows.length === 0) {
            res.status(404).json({ error: '주류 정보를 찾을 수 없습니다.' });
            return;
        }

        // 주류 정보를 저장할 배열
        const liquorsInfo = [];

        // 주류별로 리뷰 정보를 가져와서 주류 정보에 추가
        for (const liquorRow of liquorRows) {
            const [reviewRows] = await conn.promise().query(reviewQuery, [liquorRow.liquorID]);

            // 주류 정보 객체
            const liquorInfo = {
                liquorID: liquorRow.liquorID,
                liquorName: liquorRow.liquorName,
                liquorType: liquorRow.liquorType,
                liquorPrice: liquorRow.liquorPrice,
                liquorDetail: liquorRow.liquorDetail,
                liquorReview: reviewRows.map((reviewRow) => ({
                    liquorReviewID: reviewRow.liquorReviewID,
                    userNickname: reviewRow.userNickname,
                    liquorStar: reviewRow.liquorStar,
                    liquorReviewDetail: reviewRow.liquorReviewDetail
                }))
            };

            liquorsInfo.push(liquorInfo);
        }

        // 연결 종료
        conn.end();

        // 클라이언트에 응답 보내기
        res.json(liquorsInfo);
    } catch (error) {
        console.error('에러:', error);
        res.status(500).json({ error: '내부 서버 오류' });
    }
});


// 주류 id로 한개조회 api.
app.get('/liquor/info/:liquorID', async (req, res) => {
    try {
        // 요청에서 liquorname 파라미터 가져오기
        const liquorID = req.params.liquorID;
        
        // 데이터베이스 연결 초기화
        const conn = db.init();
        
        // 데이터베이스 연결
        db.connect(conn);
        
        // liquor 테이블에서 해당 liquorname을 포함하는 주류들의 정보 가져오기
        const liquorQuery = `
      SELECT
        liquorID,
        liquorName,
        liquorType,
        liquorPrice,
        liquorDetail
      FROM liquor
      WHERE liquorID = ?
    `;
        
        // liquor_review 테이블에서 해당 liquorID의 리뷰 정보 가져오기
        const reviewQuery = `
      SELECT
        liquorReviewID,
        userNickname,
        liquorID,
        liquorStar,
        liquorReviewDetail
      FROM liquor_review
      WHERE liquorID = ?
    `;
        
        // 쿼리 실행
        const [liquorRows] = await conn.promise().query(liquorQuery, liquorID);
        
        // 결과가 없을 경우 404 에러 응답
        if (liquorRows.length === 0) {
            res.status(404).json({ error: '주류 정보를 찾을 수 없습니다.' });
            return;
        }
        
        // 주류 정보를 저장할 배열
        const liquorsInfo = [];
        
        // 주류별로 리뷰 정보를 가져와서 주류 정보에 추가
        for (const liquorRow of liquorRows) {
            const [reviewRows] = await conn.promise().query(reviewQuery, [liquorRow.liquorID]);
            
            // 주류 정보 객체
            const liquorInfo = {
                liquorID: liquorRow.liquorID,
                liquorName: liquorRow.liquorName,
                liquorType: liquorRow.liquorType,
                liquorPrice: liquorRow.liquorPrice,
                liquorDetail: liquorRow.liquorDetail,
                liquorReview: reviewRows.map((reviewRow) => ({
                    liquorReviewID: reviewRow.liquorReviewID,
                    userNickname: reviewRow.userNickname,
                    liquorStar: reviewRow.liquorStar,
                    liquorReviewDetail: reviewRow.liquorReviewDetail
                }))
            };
            
            liquorsInfo.push(liquorInfo);
        }
        
        // 연결 종료
        conn.end();
        
        // 클라이언트에 응답 보내기
        res.json(liquorsInfo);
    } catch (error) {
        console.error('에러:', error);
        res.status(500).json({ error: '내부 서버 오류' });
    }
});

// 주류 즐겨찾기 조회 (주류 아이디를 응답으로 보냄)
app.get('/liquor/bookmark/:userID', async (req, res) => {
    try {
        // 요청에서 userID 파라미터 가져오기
        const userID = req.params.userID;

        // 데이터베이스 연결 초기화
        const conn = db.init();

        // 데이터베이스 연결
        db.connect(conn);

        // liquor_favor 테이블에서 해당 userID의 liquorID 목록 가져오기
        const query = `
      SELECT 
        liquorID
      FROM liquor_favor
      WHERE userID = ?
    `;

        // 쿼리 실행
        const [rows] = await conn.promise().query(query, [userID]);

        // 연결 종료
        conn.end();

        // 데이터를 원하는 구조로 정리
        const bookmarkedLiquorIDs = rows.map(row => row.liquorID);

        // 클라이언트에 응답 보내기
        res.json(bookmarkedLiquorIDs);
    } catch (error) {
        console.error('에러:', error);
        res.status(500).json({ error: '내부 서버 오류' });
    }
});

//주류 이름 검색 api
// app.get('/liquor/search/:liquorname', async (req, res) => {
//     try {
//         // 요청에서 liquorname 파라미터 가져오기
//         const liquorname = req.params.liquorname;
//
//         // 데이터베이스 연결 초기화
//         const conn = db.init();
//
//         // 데이터베이스 연결
//         db.connect(conn);
//
//         // liquor 테이블에서 해당 liquorname을 포함하는 주류들의 정보 가져오기
//         const query = `
//       SELECT
//         liquorID,
//         liquorName,
//         liquorType,
//         liquorPrice,
//         liquorDetail
//       FROM liquor
//       WHERE liquorName LIKE ?
//     `;
//
//         // 쿼리 실행
//         const [rows] = await conn.promise().query(query, [`%${liquorname}%`]);
//
//         // 연결 종료
//         conn.end();
//
//         // 클라이언트에 응답 보내기
//         if (rows.length > 0) {
//             // 검색된 이름이 여러개라면 배열에 담아서 전송
//             if (rows.length > 1) {
//                 const liquorsInfo = rows.map((row) => ({
//                     liquorID: row.liquorID,
//                     liquorName: row.liquorName,
//                     liquorType: row.liquorType,
//                     liquorPrice: row.liquorPrice,
//                     liquorDetail: row.liquorDetail
//                 }));
//                 res.json(liquorsInfo);
//             } else {
//                 // 검색된 이름이 하나라면 객체로 전송
//                 const liquorInfo = {
//                     liquorID: rows[0].liquorID,
//                     liquorName: rows[0].liquorName,
//                     liquorType: rows[0].liquorType,
//                     liquorPrice: rows[0].liquorPrice,
//                     liquorDetail: rows[0].liquorDetail
//                 };
//                 res.json(liquorInfo);
//             }
//         } else {
//             res.status(404).json({ error: '주류 정보를 찾을 수 없습니다.' });
//         }
//     } catch (error) {
//         console.error('에러:', error);
//         res.status(500).json({ error: '내부 서버 오류' });
//     }
// });

//주류 찜하기 기능 api
app.post('/liquor/bookmark/:liquorID', async (req, res) => {
    try {
        // 요청에서 liquorID 파라미터 가져오기
        const liquorID = req.params.liquorID;

        // 요청에서 userID 바디 데이터 가져오기
        const { userID } = req.body;

        // 데이터베이스 연결 초기화
        const conn = db.init();

        // 데이터베이스 연결
        db.connect(conn);

        // liquor_favor 테이블에서 해당 userID와 liquorID가 있는지 확인
        const checkQuery = `
      SELECT *
      FROM liquor_favor
      WHERE userID = ? AND liquorID = ?
    `;

        // 쿼리 실행
        const [checkResult] = await conn.promise().query(checkQuery, [userID, liquorID]);

        if (checkResult.length > 0) {
            // 이미 존재한다면 해당 레코드 삭제
            const deleteQuery = `
        DELETE FROM liquor_favor
        WHERE userID = ? AND liquorID = ?
      `;

            // 쿼리 실행
            const [deleteResult] = await conn.promise().query(deleteQuery, [userID, liquorID]);

            // 클라이언트에 응답 보내기
            if (deleteResult.affectedRows > 0) {
                res.json({ message: '즐겨찾기가 삭제되었습니다.' });
            } else {
                res.status(500).json({ error: '즐겨찾기 삭제에 실패했습니다.' });
            }
        } else {
            // 존재하지 않으면 추가
            const insertQuery = `
        INSERT INTO liquor_favor (liquorID, userID)
        VALUES (?, ?)
      `;

            // 쿼리 실행
            const [insertResult] = await conn.promise().query(insertQuery, [liquorID, userID]);

            // 클라이언트에 응답 보내기
            if (insertResult.affectedRows > 0) {
                res.json({ message: '즐겨찾기에 추가되었습니다.' });
            } else {
                res.status(500).json({ error: '즐겨찾기 추가에 실패했습니다.' });
            }
        }

        // 연결 종료
        conn.end();
    } catch (error) {
        console.error('에러:', error);
        res.status(500).json({ error: '내부 서버 오류' });
    }
});

//주류 리뷰하기 api
app.post('/liquor/review/:liquorID', async (req, res) => {
    const { liquorID } = req.params;
    const { userNickname, liquorStar, liquorReviewDetail } = req.body;

    try {
        // 데이터베이스 연결 초기화
        const conn = db.init();

        // 데이터베이스 연결
        db.connect(conn);

        // 이미 리뷰가 존재하는지 확인
        const [existingReview] = await conn.promise().query(
            'SELECT * FROM liquor_review WHERE userNickname = ? AND liquorID = ?',
            [userNickname, liquorID]
        );

        if (existingReview.length > 0) {
            conn.end(); // 연결 종료
            return res.status(400).json({ error: '이미 리뷰한 주류입니다' });
        }

        // 리뷰 추가(닉네임, 주류ID, 주류별점, 리뷰내용)
        await conn.promise().query(
            'INSERT INTO liquor_review (userNickname, liquorID, liquorStar, liquorReviewDetail) VALUES (?, ?, ?, ?)',
            [userNickname, liquorID, liquorStar, liquorReviewDetail]
        );

        conn.end(); // 연결 종료
        res.json({ message: '주류 리뷰가 성공적으로 추가되었습니다' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

//리뷰한 주류 불러오기 api
app.get('/liquor/review/:userNickname', async (req, res) => {
    const { userNickname } = req.params;

    try {
        // 데이터베이스 연결 초기화
        const conn = db.init();

        // 데이터베이스 연결
        db.connect(conn);

        // 주류 리뷰 내역 불러오는 쿼리
        const [reviews] = await conn.promise().query(
            'SELECT l.liquorReviewID, l.userNickname, l.liquorID, l.liquorStar, l.liquorReviewDetail, li.liquorName FROM liquor_review l JOIN liquor li ON l.liquorID = li.liquorID WHERE l.userNickname = ?',
            [userNickname]
        );

        conn.end(); // 연결 종료

        // 리뷰 내역 응답
        res.json({ reviews });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
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