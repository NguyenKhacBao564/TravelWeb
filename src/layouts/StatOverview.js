import React, {useEffect, useState} from 'react';
import "../styles/layouts/StackOverview.scss";
import Image from 'react-bootstrap/Image';
function StatsOverview() {

    const [count1, setCount1] = useState(0);
    const [count2, setCount2] = useState(0);
    const [count3, setCount3] = useState(0);

  useEffect(() => {
    const duration = 2000; // 2 giây
    const steps = 60; // Số bước (càng nhiều càng mượt)
    const increment1 = 880 / steps;
    const increment2 = 720 / steps;
    const increment3 = 500 / steps;

    let currentCount1 = 0;
    let currentCount2 = 0;
    let currentCount3 = 0;

    const interval = setInterval(() => {
      currentCount1 += increment1;
      currentCount2 += increment2;
      currentCount3 += increment3;

      if (currentCount1 >= 880) {
        setCount1(880);
        setCount2(720);
        setCount3(500);
        clearInterval(interval);
      } else {
        setCount1(Math.floor(currentCount1));
        setCount2(Math.floor(currentCount2));
        setCount3(Math.floor(currentCount3));
      }
    }, duration / steps);

    return () => clearInterval(interval); // Cleanup
  }, []);


  return (
    <div className="stats-overview mt-5" >
      <h2>Chứng tỏ năng lực chúng tôi qua con số thực tế nhất nhé!</h2>
      <Image className='decoricon1 w-100px' src="decor_icon1.png"  ></Image>
      <Image className='decoricon2 w-100px' src="decor_icon2.png" ></Image>
      <div className="stats-container">
        <div className="stat-item">
        <Image className='w-25' src="customer.png" ></Image>
          <h3>{count1}+</h3>
          <p>Khách hàng đặt tour</p>
        </div>
        <div className="stat-item">
        <Image className='w-25' src="airplane.png"  style={{width: '50px'}}></Image>
          <h3>{count2}+</h3>
          <p>Chuyến đi được thực hiện</p>
        </div>
        <div className="stat-item">
        <Image className='w-25' src="customer-review.png"  style={{width: '50px'}}></Image>
          <h3>{count3}+</h3>
          <p>Điểm đến 5* để lựa chọn</p>
        </div>
      </div>
    </div>
  );
}

export default StatsOverview;