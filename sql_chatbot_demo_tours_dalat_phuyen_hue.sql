/*
  Focused chatbot demo seed data.

  Purpose:
  - Make TravelWeb MSSQL useful for chatbot UI demos.
  - Focus on 3 destinations that are easy to demonstrate: Da Lat, Phu Yen, Hue.
  - Cover multiple months across 2026-2027 and varied adult prices below/above 5 million VND.

  Idempotent:
  - Safe to re-run; inserts rows only when missing.
*/

SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @DemoTours TABLE (
    tour_id VARCHAR(20) PRIMARY KEY,
    branch_id INT NOT NULL,
    name NVARCHAR(150) NOT NULL,
    duration INT NOT NULL,
    destination NVARCHAR(200) NOT NULL,
    departure_location NVARCHAR(200),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    description NVARCHAR(MAX),
    max_guests INT NOT NULL,
    transport NVARCHAR(100),
    status NVARCHAR(20) NOT NULL,
    adult_price DECIMAL(15,2) NOT NULL,
    image_url VARCHAR(500) NOT NULL
);

INSERT INTO @DemoTours (
    tour_id, branch_id, name, duration, destination, departure_location,
    start_date, end_date, description, max_guests, transport, status,
    adult_price, image_url
)
VALUES
('TOURD001', 14, N'Tour Đà Lạt tháng 5 tiết kiệm 3N2Đ', 3, N'Đà Lạt', N'TP.HCM', '2026-05-09', '2026-05-11', N'Gói Đà Lạt dưới 5 triệu, phù hợp kiểm thử chatbot theo điểm đến, tháng và ngân sách.', 28, N'Xe du lịch', 'active', 3200000.00, 'uploads/1748991466258-508326155.jpg'),
('TOURD002', 14, N'Tour Đà Lạt săn mây tháng 5', 3, N'Đà Lạt', N'TP.HCM', '2026-05-22', '2026-05-24', N'Săn mây Cầu Đất, hồ Tuyền Lâm, chợ đêm và vườn hoa thành phố.', 26, N'Xe du lịch', 'active', 4500000.00, 'uploads/1748991993683-95278060.webp'),
('TOURD003', 14, N'Tour Đà Lạt nghỉ dưỡng cao cấp tháng 5', 4, N'Đà Lạt', N'TP.HCM', '2026-05-29', '2026-06-01', N'Lịch trình nghỉ dưỡng khách sạn tốt hơn, tham quan Langbiang, Datanla và Cầu Đất.', 22, N'Xe du lịch', 'active', 6200000.00, 'uploads/1749840305686-260807586.jpg'),
('TOURD004', 14, N'Tour Đà Lạt hè tháng 6', 3, N'Đà Lạt', N'TP.HCM', '2026-06-12', '2026-06-14', N'Tour hè Đà Lạt giá vừa, phù hợp nhóm bạn và gia đình.', 28, N'Xe du lịch', 'active', 4800000.00, 'uploads/1749840454706-907979018.jpg'),
('TOURD005', 14, N'Tour Đà Lạt tháng 7 gia đình', 3, N'Đà Lạt', N'TP.HCM', '2026-07-10', '2026-07-12', N'Lịch trình nhẹ cho gia đình: nông trại, vườn hoa, quảng trường Lâm Viên.', 30, N'Xe du lịch', 'active', 5600000.00, 'uploads/1749966246797-423570007.jpg'),
('TOURD006', 14, N'Tour Đà Lạt mùa thu tháng 9', 3, N'Đà Lạt', N'TP.HCM', '2026-09-18', '2026-09-20', N'Tham quan thác Datanla, Cầu Đất, hồ Tuyền Lâm và thưởng thức cà phê địa phương.', 26, N'Xe du lịch', 'active', 3900000.00, 'uploads/1748991466263-421697637.jpg'),
('TOURD007', 14, N'Tour Đà Lạt cuối năm tháng 11', 3, N'Đà Lạt', N'TP.HCM', '2026-11-20', '2026-11-22', N'Lịch cuối năm giá tốt, phù hợp kiểm thử partial search theo điểm đến và tháng.', 26, N'Xe du lịch', 'active', 4700000.00, 'uploads/1748991466264-695623005.jpg'),
('TOURD008', 14, N'Tour Đà Lạt Noel 4N3Đ', 4, N'Đà Lạt', N'TP.HCM', '2026-12-24', '2026-12-27', N'Không khí Giáng sinh Đà Lạt, nhà thờ Domaine, chợ đêm và nghỉ dưỡng cuối năm.', 24, N'Xe du lịch', 'active', 7200000.00, 'uploads/1749840305686-260807586.jpg'),
('TOURD009', 14, N'Tour Đà Lạt đầu năm 2027', 3, N'Đà Lạt', N'TP.HCM', '2027-01-10', '2027-01-12', N'Lịch đầu năm đi Đà Lạt, giá dưới 5 triệu cho kiểm thử năm 2027.', 28, N'Xe du lịch', 'active', 4400000.00, 'uploads/1748991993683-95278060.webp'),
('TOURD010', 14, N'Tour Đà Lạt tháng 3 mùa hoa', 3, N'Đà Lạt', N'TP.HCM', '2027-03-12', '2027-03-14', N'Tour mùa hoa, Cầu Đất, vườn hoa thành phố và chợ đêm.', 26, N'Xe du lịch', 'active', 5100000.00, 'uploads/1749840454706-907979018.jpg'),
('TOURD011', 14, N'Tour Đà Lạt tháng 5 2027 giá tốt', 3, N'Đà Lạt', N'TP.HCM', '2027-05-14', '2027-05-16', N'Gói Đà Lạt tháng 5/2027 dưới 5 triệu để test truy vấn theo năm.', 28, N'Xe du lịch', 'active', 4600000.00, 'uploads/1748991466258-508326155.jpg'),
('TOURD012', 14, N'Tour Đà Lạt tháng 8 nghỉ dưỡng', 4, N'Đà Lạt', N'TP.HCM', '2027-08-21', '2027-08-24', N'Nghỉ dưỡng Đà Lạt 4 ngày, giá cao hơn để test truy vấn trên 5 triệu.', 22, N'Xe du lịch', 'active', 6800000.00, 'uploads/1749840305686-260807586.jpg'),

('TOURD013', 5, N'Tour Phú Yên tháng 5 tiết kiệm', 3, N'Phú Yên', N'TP.HCM', '2026-05-08', '2026-05-10', N'Gành Đá Dĩa, Bãi Xép, Mũi Điện và hải sản địa phương, giá dưới 5 triệu.', 30, N'Xe du lịch', 'active', 3600000.00, 'uploads/1748991993669-582057393.jpg'),
('TOURD014', 5, N'Tour Phú Yên biển xanh tháng 5', 3, N'Phú Yên', N'TP.HCM', '2026-05-23', '2026-05-25', N'Lịch tháng 5/2026 cho chatbot test điểm đến Phú Yên và ngân sách.', 28, N'Xe du lịch', 'active', 4800000.00, 'uploads/1749840454733-579914947.jpg'),
('TOURD015', 5, N'Tour Phú Yên cao cấp tháng 6', 4, N'Phú Yên', N'TP.HCM', '2026-06-06', '2026-06-09', N'Lịch trình 4 ngày với khách sạn tốt hơn, Gành Đá Dĩa và Mũi Điện.', 24, N'Xe du lịch', 'active', 5400000.00, 'uploads/1748991993681-755395162.webp'),
('TOURD016', 5, N'Tour Phú Yên tháng 8 gia đình', 4, N'Phú Yên', N'TP.HCM', '2026-08-15', '2026-08-18', N'Gói gia đình mùa hè, nghỉ dưỡng biển và tham quan Bãi Xép.', 24, N'Xe du lịch', 'active', 6300000.00, 'uploads/1748991993669-582057393.jpg'),
('TOURD017', 5, N'Tour Phú Yên cuối năm tiết kiệm', 3, N'Phú Yên', N'TP.HCM', '2026-12-19', '2026-12-21', N'Lịch cuối năm dưới 5 triệu, phù hợp test budget ceiling.', 28, N'Xe du lịch', 'active', 4900000.00, 'uploads/1749840454733-579914947.jpg'),
('TOURD018', 5, N'Tour Phú Yên đầu năm 2027', 3, N'Phú Yên', N'TP.HCM', '2027-01-08', '2027-01-10', N'Lịch đầu năm tham quan biển Phú Yên và đặc sản địa phương.', 28, N'Xe du lịch', 'active', 5200000.00, 'uploads/1748991993681-755395162.webp'),
('TOURD019', 5, N'Tour Phú Yên tháng 3 giá tốt', 3, N'Phú Yên', N'TP.HCM', '2027-03-20', '2027-03-22', N'Tour Phú Yên dưới 4 triệu, dùng để test mức giá thấp.', 30, N'Xe du lịch', 'active', 3800000.00, 'uploads/1748991993669-582057393.jpg'),
('TOURD020', 5, N'Tour Phú Yên tháng 5 2027 dưới 5 triệu', 3, N'Phú Yên', N'TP.HCM', '2027-05-15', '2027-05-17', N'Lịch Phú Yên tháng 5/2027 dưới 5 triệu, khớp trực tiếp demo chatbot.', 30, N'Xe du lịch', 'active', 4700000.00, 'uploads/1749840454733-579914947.jpg'),
('TOURD021', 5, N'Tour Phú Yên tháng 5 2027 nghỉ dưỡng', 4, N'Phú Yên', N'TP.HCM', '2027-05-29', '2027-06-01', N'Gói nghỉ dưỡng Phú Yên tháng 5/2027 trên 5 triệu.', 24, N'Xe du lịch', 'active', 6100000.00, 'uploads/1748991993681-755395162.webp'),
('TOURD022', 5, N'Tour Phú Yên tháng 7 biển đảo', 3, N'Phú Yên', N'TP.HCM', '2027-07-17', '2027-07-19', N'Tour biển đảo mùa hè, giá trung bình trên 5 triệu.', 26, N'Xe du lịch', 'active', 5800000.00, 'uploads/1748991993669-582057393.jpg'),
('TOURD023', 5, N'Tour Phú Yên tháng 10 tiết kiệm', 3, N'Phú Yên', N'TP.HCM', '2027-10-09', '2027-10-11', N'Gói Phú Yên giá tốt tháng 10, phù hợp test partial search.', 28, N'Xe du lịch', 'active', 4200000.00, 'uploads/1749840454733-579914947.jpg'),
('TOURD024', 5, N'Tour Phú Yên countdown', 4, N'Phú Yên', N'TP.HCM', '2027-12-24', '2027-12-27', N'Đón cuối năm ở Phú Yên, Mũi Điện, Bãi Xép và hải sản địa phương.', 24, N'Xe du lịch', 'active', 7000000.00, 'uploads/1748991993681-755395162.webp'),

('TOURD025', 11, N'Tour Huế tháng 5 dưới 5 triệu', 3, N'Huế', N'Hà Nội', '2026-05-16', '2026-05-18', N'Đại Nội, chùa Thiên Mụ, sông Hương và ẩm thực Huế với ngân sách dưới 5 triệu.', 28, N'Máy bay', 'active', 4400000.00, 'uploads/1748992110016-911653533.jpg'),
('TOURD026', 11, N'Tour Huế tháng 5 di sản 4N3Đ', 4, N'Huế', N'Hà Nội', '2026-05-30', '2026-06-02', N'Tour Huế 4 ngày, giá trên 5 triệu để test truy vấn ngân sách cao.', 24, N'Máy bay', 'active', 5200000.00, 'uploads/1749840305714-180351776.jpg'),
('TOURD027', 11, N'Tour Huế tháng 6 giá tốt', 3, N'Huế', N'Hà Nội', '2026-06-20', '2026-06-22', N'Lịch Huế tháng 6 dưới 4 triệu, phù hợp test budget thấp.', 28, N'Máy bay', 'active', 3900000.00, 'uploads/1749910681402-187173158.jpg'),
('TOURD028', 11, N'Tour Huế tháng 9 cung đình', 4, N'Huế', N'Hà Nội', '2026-09-05', '2026-09-08', N'Tour Huế mùa thu, Đại Nội, lăng Khải Định, ca Huế trên sông Hương.', 24, N'Máy bay', 'active', 5800000.00, 'uploads/1750175163168-99659853.png'),
('TOURD029', 11, N'Tour Huế tháng 12 tiết kiệm', 3, N'Huế', N'Hà Nội', '2026-12-12', '2026-12-14', N'Gói Huế cuối năm dưới 5 triệu, phù hợp chatbot demo.', 28, N'Máy bay', 'active', 4600000.00, 'uploads/1748992110016-911653533.jpg'),
('TOURD030', 11, N'Tour Huế đầu năm 2027', 4, N'Huế', N'Hà Nội', '2027-01-23', '2027-01-26', N'Du xuân Huế, Đại Nội, chùa Thiên Mụ và phố đi bộ.', 24, N'Máy bay', 'active', 5600000.00, 'uploads/1749840305714-180351776.jpg'),
('TOURD031', 11, N'Tour Huế tháng 3 giá tốt', 3, N'Huế', N'Hà Nội', '2027-03-07', '2027-03-09', N'Tour Huế tháng 3 dưới 5 triệu, lịch trình nhẹ cho nhóm nhỏ.', 28, N'Máy bay', 'active', 4100000.00, 'uploads/1749910681402-187173158.jpg'),
('TOURD032', 11, N'Tour Huế tháng 5 2027 dưới 5 triệu', 3, N'Huế', N'Hà Nội', '2027-05-08', '2027-05-10', N'Lịch Huế tháng 5/2027 dưới 5 triệu, dùng để test truy vấn theo năm.', 28, N'Máy bay', 'active', 4900000.00, 'uploads/1748992110016-911653533.jpg'),
('TOURD033', 11, N'Tour Huế tháng 5 2027 cao cấp', 4, N'Huế', N'Hà Nội', '2027-05-28', '2027-05-31', N'Lịch Huế tháng 5/2027 trên 5 triệu, khách sạn tốt hơn.', 24, N'Máy bay', 'active', 5900000.00, 'uploads/1749840305714-180351776.jpg'),
('TOURD034', 11, N'Tour Huế tháng 7 nghỉ dưỡng', 4, N'Huế', N'Hà Nội', '2027-07-11', '2027-07-14', N'Tour nghỉ dưỡng Huế mùa hè, kết hợp phá Tam Giang và di sản.', 24, N'Máy bay', 'active', 6400000.00, 'uploads/1750175163168-99659853.png'),
('TOURD035', 11, N'Tour Huế tháng 10 tiết kiệm', 3, N'Huế', N'Hà Nội', '2027-10-16', '2027-10-18', N'Lịch Huế tháng 10 dưới 5 triệu, phù hợp kiểm thử partial search.', 28, N'Máy bay', 'active', 4700000.00, 'uploads/1749910681402-187173158.jpg'),
('TOURD036', 11, N'Tour Huế cuối năm cao cấp', 4, N'Huế', N'Hà Nội', '2027-12-18', '2027-12-21', N'Tour Huế cuối năm, lịch trình sâu về di sản và ẩm thực cung đình.', 24, N'Máy bay', 'active', 7600000.00, 'uploads/1750175163168-99659853.png');

INSERT INTO Tour (
    tour_id, branch_id, name, duration, destination, departure_location,
    start_date, end_date, description, max_guests, transport, status
)
SELECT
    dt.tour_id, dt.branch_id, dt.name, dt.duration, dt.destination,
    dt.departure_location, dt.start_date, dt.end_date, dt.description,
    dt.max_guests, dt.transport, dt.status
FROM @DemoTours AS dt
WHERE NOT EXISTS (
    SELECT 1 FROM Tour AS t WHERE t.tour_id = dt.tour_id
);

INSERT INTO Tour_price (tour_id, age_group, price)
SELECT
    dt.tour_id,
    p.age_group,
    p.price
FROM @DemoTours AS dt
CROSS APPLY (
    VALUES
        ('adultPrice', dt.adult_price),
        ('childPrice', ROUND(dt.adult_price * 0.70, 0)),
        ('infantPrice', ROUND(dt.adult_price * 0.40, 0))
) AS p(age_group, price)
WHERE NOT EXISTS (
    SELECT 1
    FROM Tour_price AS tp
    WHERE tp.tour_id = dt.tour_id
      AND tp.age_group = p.age_group
);

INSERT INTO Tour_image (image_id, tour_id, image_url)
SELECT
    CONCAT('IMGD', RIGHT(dt.tour_id, 3)),
    dt.tour_id,
    dt.image_url
FROM @DemoTours AS dt
WHERE NOT EXISTS (
    SELECT 1
    FROM Tour_image AS ti
    WHERE ti.image_id = CONCAT('IMGD', RIGHT(dt.tour_id, 3))
);

INSERT INTO Tour_Schedule (schedule_id, tour_id, day_number, tour_route, detail)
SELECT
    CONCAT('SCD', RIGHT(dt.tour_id, 3), 'D', d.day_number),
    dt.tour_id,
    d.day_number,
    CASE d.day_number
        WHEN 1 THEN N'Khởi hành'
        WHEN dt.duration THEN N'Kết thúc'
        ELSE N'Tham quan'
    END,
    CASE d.day_number
        WHEN 1 THEN CONCAT(N'Khởi hành từ ', dt.departure_location, N', di chuyển đến ', dt.destination, N' và nhận phòng.')
        WHEN dt.duration THEN CONCAT(N'Tự do mua đặc sản ', dt.destination, N', trả phòng và trở về điểm xuất phát.')
        ELSE CONCAT(N'Tham quan các điểm nổi bật tại ', dt.destination, N', dùng bữa theo chương trình và nghỉ đêm.')
    END
FROM @DemoTours AS dt
CROSS APPLY (
    VALUES (1), (2), (3), (4)
) AS d(day_number)
WHERE d.day_number <= dt.duration
  AND NOT EXISTS (
      SELECT 1
      FROM Tour_Schedule AS ts
      WHERE ts.schedule_id = CONCAT('SCD', RIGHT(dt.tour_id, 3), 'D', d.day_number)
  );

COMMIT TRANSACTION;

SELECT
    destination,
    COUNT(*) AS demo_tours,
    MIN(start_date) AS first_departure,
    MAX(start_date) AS last_departure
FROM Tour
WHERE tour_id LIKE 'TOURD%'
GROUP BY destination
ORDER BY destination;
