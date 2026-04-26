/*
  Seed future tour data for chatbot/search testing.

  Scope:
  - Current project date: 2026-04-25
  - Coverage: 2026-04-30 through 2027-12-28
  - Idempotent: safe to re-run; rows are inserted only when missing.
  - Business convention: adultPrice is the searchable/display price.
*/

SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @FutureTours TABLE (
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

INSERT INTO @FutureTours (
    tour_id, branch_id, name, duration, destination, departure_location,
    start_date, end_date, description, max_guests, transport, status,
    adult_price, image_url
)
VALUES
('TOURF001', 14, N'Tour Đà Lạt săn mây cuối tháng 4', 3, N'Đà Lạt', N'TP.HCM', '2026-04-30', '2026-05-02', N'Lịch khởi hành gần nhất cho khách muốn đi Đà Lạt, săn mây Cầu Đất, tham quan hồ Tuyền Lâm và chợ đêm.', 24, N'Xe du lịch', 'upcoming', 4200000.00, 'uploads/1748991466258-508326155.jpg'),
('TOURF002', 5, N'Tour Phú Yên biển xanh tháng 5', 3, N'Phú Yên', N'TP.HCM', '2026-05-08', '2026-05-10', N'Tham quan Gành Đá Dĩa, Bãi Xép, Mũi Điện và thưởng thức hải sản địa phương.', 26, N'Xe du lịch', 'active', 4800000.00, 'uploads/1748991993669-582057393.jpg'),
('TOURF003', 11, N'Tour Huế di sản tháng 5', 4, N'Huế', N'Hà Nội', '2026-05-16', '2026-05-19', N'Khám phá Đại Nội, lăng Tự Đức, chùa Thiên Mụ, sông Hương và ẩm thực cung đình Huế.', 22, N'Máy bay', 'active', 5200000.00, 'uploads/1748992110016-911653533.jpg'),
('TOURF004', 3, N'Tour Đà Nẵng lễ hội pháo hoa', 3, N'Đà Nẵng', N'Hà Nội', '2026-06-05', '2026-06-07', N'Tận hưởng biển Mỹ Khê, Bà Nà Hills, cầu Rồng và không khí lễ hội mùa hè Đà Nẵng.', 28, N'Máy bay', 'active', 6500000.00, 'uploads/1748992591114-771028534.jpg'),
('TOURF005', 18, N'Tour Phú Quốc nghỉ dưỡng hè', 4, N'Phú Quốc', N'TP.HCM', '2026-06-20', '2026-06-23', N'Nghỉ dưỡng tại đảo ngọc, tham quan Bãi Sao, Grand World, làng chài Hàm Ninh và chợ đêm.', 24, N'Máy bay', 'active', 7900000.00, 'uploads/1748992624769-867204543.jpg'),
('TOURF006', 7, N'Tour Nha Trang lặn biển tháng 7', 3, N'Nha Trang', N'TP.HCM', '2026-07-04', '2026-07-06', N'Khám phá vịnh Nha Trang, đảo Hòn Mun, trải nghiệm lặn biển và thưởng thức hải sản.', 25, N'Xe du lịch', 'active', 5900000.00, 'uploads/1748992823621-679362385.webp'),
('TOURF007', 1, N'Tour Hà Nội thu sớm', 2, N'Hà Nội', N'TP.HCM', '2026-08-15', '2026-08-16', N'Dạo phố cổ, Hồ Gươm, Văn Miếu và thưởng thức đặc sản Hà Nội trong lịch trình ngắn ngày.', 30, N'Máy bay', 'active', 3200000.00, 'uploads/1748978720938-433788546.jpeg'),
('TOURF008', 10, N'Tour Vịnh Hạ Long nghỉ dưỡng', 3, N'Vịnh Hạ Long', N'Hà Nội', '2026-09-05', '2026-09-07', N'Du thuyền vịnh Hạ Long, tham quan hang Sửng Sốt, đảo Titop và nghỉ dưỡng ven biển.', 26, N'Xe du lịch', 'active', 6800000.00, 'uploads/1749838991177-517798552.webp'),
('TOURF009', 12, N'Tour Hội An mùa đèn lồng', 3, N'Hội An', N'Đà Nẵng', '2026-10-10', '2026-10-12', N'Tản bộ phố cổ Hội An, thả hoa đăng, tham quan làng rau Trà Quế và Cù Lao Chàm.', 24, N'Xe du lịch', 'active', 4900000.00, 'uploads/1749838991187-621996758.webp'),
('TOURF010', 16, N'Tour Quy Nhơn biển xanh', 3, N'Quy Nhơn', N'TP.HCM', '2026-11-14', '2026-11-16', N'Khám phá Kỳ Co, Eo Gió, tháp Chăm và ẩm thực miền biển Bình Định.', 24, N'Máy bay', 'active', 5400000.00, 'uploads/1749838991205-962002627.jpg'),
('TOURF011', 1, N'Tour Sapa mùa đông', 4, N'Sapa', N'Hà Nội', '2026-12-05', '2026-12-08', N'Săn mây Fansipan, thăm bản Cát Cát, chợ đêm Sapa và trải nghiệm khí hậu vùng cao.', 20, N'Xe giường nằm', 'active', 6200000.00, 'uploads/1749838991209-952077580.webp'),
('TOURF012', 14, N'Tour Đà Lạt Noel', 3, N'Đà Lạt', N'TP.HCM', '2026-12-24', '2026-12-26', N'Trải nghiệm không khí Giáng sinh Đà Lạt, quảng trường Lâm Viên, nhà thờ Domaine và chợ đêm.', 24, N'Xe du lịch', 'active', 4600000.00, 'uploads/1749840305686-260807586.jpg'),
('TOURF013', 5, N'Tour Phú Yên Tết biển', 3, N'Phú Yên', N'TP.HCM', '2027-01-08', '2027-01-10', N'Lịch đầu năm đi Phú Yên với Gành Đá Dĩa, đầm Ô Loan, Mũi Điện và bữa hải sản địa phương.', 26, N'Xe du lịch', 'active', 5100000.00, 'uploads/1749840305691-208517715.jpg'),
('TOURF014', 11, N'Tour Huế đầu xuân', 4, N'Huế', N'Hà Nội', '2027-01-23', '2027-01-26', N'Du xuân Huế, tham quan Đại Nội, lăng Khải Định, chùa Thiên Mụ và thưởng thức ca Huế.', 22, N'Máy bay', 'active', 5600000.00, 'uploads/1749840305714-180351776.jpg'),
('TOURF015', 3, N'Tour Đà Nẵng nghỉ dưỡng sau Tết', 3, N'Đà Nẵng', N'Hà Nội', '2027-02-14', '2027-02-16', N'Nghỉ dưỡng biển Mỹ Khê, ghé Sơn Trà, Ngũ Hành Sơn và thưởng thức đặc sản miền Trung.', 28, N'Máy bay', 'active', 6100000.00, 'uploads/1749840305717-213689110.jpg'),
('TOURF016', 18, N'Tour Phú Quốc mùa khô', 4, N'Phú Quốc', N'TP.HCM', '2027-02-27', '2027-03-02', N'Lịch đẹp mùa khô Phú Quốc, phù hợp nghỉ dưỡng gia đình, tham quan Bãi Sao và chợ đêm.', 24, N'Máy bay', 'active', 8300000.00, 'uploads/1749840305719-814237331.jpg'),
('TOURF017', 14, N'Tour Đà Lạt mùa hoa tháng 3', 3, N'Đà Lạt', N'TP.HCM', '2027-03-12', '2027-03-14', N'Tham quan vườn hoa thành phố, đồi chè Cầu Đất, hồ Tuyền Lâm và thưởng thức cà phê Đà Lạt.', 24, N'Xe du lịch', 'active', 4400000.00, 'uploads/1749840454706-907979018.jpg'),
('TOURF018', 7, N'Tour Nha Trang gia đình', 3, N'Nha Trang', N'TP.HCM', '2027-03-27', '2027-03-29', N'Lịch trình nhẹ cho gia đình: VinWonders, vịnh Nha Trang, tắm biển và chợ đêm.', 28, N'Xe du lịch', 'active', 5700000.00, 'uploads/1749840454710-889022333.jpg'),
('TOURF019', 12, N'Tour Hội An tháng 4', 3, N'Hội An', N'Đà Nẵng', '2027-04-10', '2027-04-12', N'Khám phá phố cổ, thả hoa đăng, làng gốm Thanh Hà và ẩm thực Hội An.', 24, N'Xe du lịch', 'active', 5000000.00, 'uploads/1749840454718-180624503.jpg'),
('TOURF020', 10, N'Tour Hạ Long dịp 30/4', 3, N'Vịnh Hạ Long', N'Hà Nội', '2027-04-28', '2027-04-30', N'Du thuyền Hạ Long dịp lễ, tham quan hang động và nghỉ dưỡng ven vịnh.', 26, N'Xe du lịch', 'active', 7200000.00, 'uploads/1749840454721-565238400.jpg'),
('TOURF021', 5, N'Tour Phú Yên hè 2027 tiết kiệm', 3, N'Phú Yên', N'TP.HCM', '2027-05-15', '2027-05-17', N'Gói Phú Yên tiết kiệm cho chatbot kiểm thử lọc địa điểm, thời gian và ngân sách dưới 5 triệu.', 30, N'Xe du lịch', 'active', 4700000.00, 'uploads/1749840454733-579914947.jpg'),
('TOURF022', 11, N'Tour Huế lễ hội mùa hè', 4, N'Huế', N'Hà Nội', '2027-05-28', '2027-05-31', N'Tham quan di sản Huế, phố đi bộ, ẩm thực cung đình và ca Huế trên sông Hương.', 22, N'Máy bay', 'active', 5900000.00, 'uploads/1749910681402-187173158.jpg'),
('TOURF023', 3, N'Tour Đà Nẵng hè 2027', 3, N'Đà Nẵng', N'Hà Nội', '2027-06-12', '2027-06-14', N'Lịch hè Đà Nẵng: biển Mỹ Khê, Bà Nà Hills, cầu Rồng và bán đảo Sơn Trà.', 28, N'Máy bay', 'active', 6700000.00, 'uploads/1749966213489-900953409.jpg'),
('TOURF024', 18, N'Tour Phú Quốc hè 2027', 4, N'Phú Quốc', N'TP.HCM', '2027-06-26', '2027-06-29', N'Nghỉ dưỡng Phú Quốc mùa hè, Bãi Sao, Sunset Town, Grand World và chợ đêm.', 24, N'Máy bay', 'active', 8500000.00, 'uploads/1749966232654-207496081.jpg'),
('TOURF025', 14, N'Tour Đà Lạt tháng 7 dưới 5 triệu', 3, N'Đà Lạt', N'TP.HCM', '2027-07-10', '2027-07-12', N'Gói Đà Lạt giá tốt dưới 5 triệu, phù hợp kiểm thử chatbot lọc location + price.', 24, N'Xe du lịch', 'active', 4300000.00, 'uploads/1749966246797-423570007.jpg'),
('TOURF026', 7, N'Tour Nha Trang biển đảo 2027', 3, N'Nha Trang', N'TP.HCM', '2027-07-24', '2027-07-26', N'Khám phá Hòn Mun, Hòn Tằm, tắm biển và ẩm thực Nha Trang.', 26, N'Xe du lịch', 'active', 6000000.00, 'uploads/1750131698356-296267835.jpg'),
('TOURF027', 1, N'Tour Hà Nội mùa thu 2027', 2, N'Hà Nội', N'TP.HCM', '2027-08-14', '2027-08-15', N'Lịch ngắn ngày Hà Nội mùa thu: phố cổ, Hồ Gươm, Văn Miếu và ẩm thực địa phương.', 30, N'Máy bay', 'active', 3500000.00, 'uploads/1750147198381-380111453.jpeg'),
('TOURF028', 16, N'Tour Quy Nhơn tháng 8', 3, N'Quy Nhơn', N'TP.HCM', '2027-08-28', '2027-08-30', N'Kỳ Co, Eo Gió, làng chài Nhơn Lý và hải sản Bình Định.', 24, N'Máy bay', 'active', 5600000.00, 'uploads/1750147198383-353211642.jpeg'),
('TOURF029', 10, N'Tour Vịnh Hạ Long tháng 9', 3, N'Vịnh Hạ Long', N'Hà Nội', '2027-09-11', '2027-09-13', N'Du thuyền Hạ Long, tham quan hang động và nghỉ dưỡng cuối tuần.', 26, N'Xe du lịch', 'active', 7000000.00, 'uploads/1750173506224-618618596.jpeg'),
('TOURF030', 1, N'Tour Sapa mùa lúa chín', 4, N'Sapa', N'Hà Nội', '2027-09-25', '2027-09-28', N'Săn mây, ruộng bậc thang mùa lúa chín, bản Cát Cát và đỉnh Fansipan.', 20, N'Xe giường nằm', 'active', 6400000.00, 'uploads/1750173506225-784195568.jpeg'),
('TOURF031', 12, N'Tour Hội An trung thu', 3, N'Hội An', N'Đà Nẵng', '2027-10-09', '2027-10-11', N'Trung thu phố Hội, đèn lồng, hoa đăng, làng rau Trà Quế và ẩm thực địa phương.', 24, N'Xe du lịch', 'active', 5200000.00, 'uploads/1750174888890-199312463.jpeg'),
('TOURF032', 13, N'Tour Côn Đảo mùa thu', 4, N'Côn Đảo', N'TP.HCM', '2027-10-23', '2027-10-26', N'Tham quan Côn Đảo, bãi Đầm Trầu, nghĩa trang Hàng Dương và nghỉ dưỡng biển.', 20, N'Máy bay', 'active', 9200000.00, 'uploads/1750174906458-355443304.jpeg'),
('TOURF033', 11, N'Tour Huế tháng 11', 4, N'Huế', N'Hà Nội', '2027-11-06', '2027-11-09', N'Lịch Huế cuối thu: Đại Nội, lăng Minh Mạng, chùa Thiên Mụ và ẩm thực xứ Huế.', 22, N'Máy bay', 'active', 5800000.00, 'uploads/1750175163168-99659853.png'),
('TOURF034', 3, N'Tour Đà Nẵng cuối năm', 3, N'Đà Nẵng', N'Hà Nội', '2027-11-20', '2027-11-22', N'Đà Nẵng cuối năm với biển Mỹ Khê, Sơn Trà, cầu Rồng và Ngũ Hành Sơn.', 28, N'Máy bay', 'active', 6300000.00, 'uploads/1750319708828-215897929.png'),
('TOURF035', 14, N'Tour Đà Lạt mùa hoa dã quỳ', 3, N'Đà Lạt', N'TP.HCM', '2027-12-04', '2027-12-06', N'Ngắm hoa dã quỳ, tham quan Cầu Đất, hồ Tuyền Lâm, thác Datanla và chợ đêm.', 24, N'Xe du lịch', 'active', 4500000.00, 'uploads/1748991466263-421697637.jpg'),
('TOURF036', 18, N'Tour Phú Quốc cuối năm', 4, N'Phú Quốc', N'TP.HCM', '2027-12-18', '2027-12-21', N'Nghỉ dưỡng cuối năm tại Phú Quốc, phù hợp nhóm gia đình và khách đi biển mùa khô.', 24, N'Máy bay', 'active', 8800000.00, 'uploads/1748991466264-695623005.jpg'),
('TOURF037', 5, N'Tour Phú Yên countdown', 3, N'Phú Yên', N'TP.HCM', '2027-12-24', '2027-12-26', N'Đón cuối năm tại Phú Yên với Mũi Điện, Bãi Xép, Gành Đá Dĩa và tiệc hải sản.', 26, N'Xe du lịch', 'active', 5300000.00, 'uploads/1748991993681-755395162.webp'),
('TOURF038', 1, N'Tour Hà Nội năm mới', 3, N'Hà Nội', N'TP.HCM', '2027-12-28', '2027-12-30', N'Lịch cuối năm tại Hà Nội, dạo phố cổ, Hồ Gươm, Văn Miếu và thưởng thức ẩm thực mùa đông.', 30, N'Máy bay', 'active', 3900000.00, 'uploads/1748991993683-322474425.jpg'),
('TOURF039', 14, N'Tour Đà Lạt tháng 5 tiết kiệm', 3, N'Đà Lạt', N'TP.HCM', '2026-05-22', '2026-05-24', N'Gói Đà Lạt khởi hành trong tháng 5/2026, giá dưới 5 triệu, dùng để kiểm thử chatbot lọc địa điểm + thời gian + ngân sách.', 24, N'Xe du lịch', 'active', 4500000.00, 'uploads/1748991993683-95278060.webp');

INSERT INTO Tour (
    tour_id, branch_id, name, duration, destination, departure_location,
    start_date, end_date, description, max_guests, transport, status
)
SELECT
    ft.tour_id, ft.branch_id, ft.name, ft.duration, ft.destination,
    ft.departure_location, ft.start_date, ft.end_date, ft.description,
    ft.max_guests, ft.transport, ft.status
FROM @FutureTours AS ft
WHERE NOT EXISTS (
    SELECT 1 FROM Tour AS t WHERE t.tour_id = ft.tour_id
);

INSERT INTO Tour_price (tour_id, age_group, price)
SELECT
    ft.tour_id,
    p.age_group,
    p.price
FROM @FutureTours AS ft
CROSS APPLY (
    VALUES
        ('adultPrice', ft.adult_price),
        ('childPrice', ROUND(ft.adult_price * 0.70, 0)),
        ('infantPrice', ROUND(ft.adult_price * 0.40, 0))
) AS p(age_group, price)
WHERE NOT EXISTS (
    SELECT 1
    FROM Tour_price AS tp
    WHERE tp.tour_id = ft.tour_id
      AND tp.age_group = p.age_group
);

INSERT INTO Tour_image (image_id, tour_id, image_url)
SELECT
    CONCAT('IMGF', RIGHT(ft.tour_id, 3)),
    ft.tour_id,
    ft.image_url
FROM @FutureTours AS ft
WHERE NOT EXISTS (
    SELECT 1
    FROM Tour_image AS ti
    WHERE ti.image_id = CONCAT('IMGF', RIGHT(ft.tour_id, 3))
);

INSERT INTO Tour_Schedule (schedule_id, tour_id, day_number, tour_route, detail)
SELECT
    CONCAT('SCHF', RIGHT(ft.tour_id, 3), 'D', d.day_number),
    ft.tour_id,
    d.day_number,
    CASE d.day_number
        WHEN 1 THEN N'Khởi hành'
        WHEN ft.duration THEN N'Kết thúc'
        ELSE N'Tham quan'
    END,
    CASE d.day_number
        WHEN 1 THEN CONCAT(N'Khởi hành từ ', ft.departure_location, N', di chuyển đến ', ft.destination, N' và nhận phòng.')
        WHEN ft.duration THEN CONCAT(N'Tự do mua sắm đặc sản ', ft.destination, N', trả phòng và trở về điểm xuất phát.')
        ELSE CONCAT(N'Tham quan các điểm nổi bật tại ', ft.destination, N', dùng bữa theo chương trình và nghỉ đêm.')
    END
FROM @FutureTours AS ft
CROSS APPLY (
    VALUES (1), (2), (3), (4)
) AS d(day_number)
WHERE d.day_number <= ft.duration
  AND NOT EXISTS (
      SELECT 1
      FROM Tour_Schedule AS ts
      WHERE ts.schedule_id = CONCAT('SCHF', RIGHT(ft.tour_id, 3), 'D', d.day_number)
  );

COMMIT TRANSACTION;

SELECT
    COUNT(*) AS seeded_future_tours,
    MIN(start_date) AS first_departure,
    MAX(start_date) AS last_departure
FROM Tour
WHERE tour_id LIKE 'TOURF%';
