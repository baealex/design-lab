import * as crypto from 'crypto';

export function createMD5(props: {
    key: string;
    text: string;
}) {
    const hash = crypto.createHmac('md5', props.key);
    return hash.update(props.text).digest('hex');
}