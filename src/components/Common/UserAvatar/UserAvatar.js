import React from 'react';
import Image from 'react-bootstrap/Image';
import Container from 'react-bootstrap/Container';
import { API_URL } from '../../../utils/API_Port';

function UserAvatar(props) {
    const {image, name, size} = props;
    
    // Xử lý đường dẫn ảnh và tránh cache bằng cách thêm timestamp
    const imageSrc = image && image.includes('http') 
        ? image 
        : image 
        ? `${API_URL}/${image}?t=${new Date().getTime()}` 
        : "/default-avatar.jpg";
    
    return (
        <Container className="flex-center gap-2" style={{maxWidth: 'fit-content', padding: 0}}>
            {name && <span style={{color: "black", whiteSpace: 'nowrap'}}>{name}</span>}
            <div style={{
                width: size,
                height: size,
                borderRadius: '50%',
                overflow: 'hidden'
            }}>
                <Image 
                    src={imageSrc} 
                    style={{
                        width: '100%', 
                        height: '100%', 
                        objectFit: "cover"
                    }}
                />
            </div>
        </Container>
    );
}

export default UserAvatar;