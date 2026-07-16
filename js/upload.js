function uploadField(id) {
    return document.getElementById(id);
}

function setUploadStatus(message, type = '') {
    const status = uploadField('upload-status');
    if (!status) return;
    status.textContent = message;
    status.className = `upload-status show ${type}`.trim();
}

function clearUploadStatus() {
    const status = uploadField('upload-status');
    if (!status) return;
    status.textContent = '';
    status.className = 'upload-status';
}

function setUploadProgress(percent, visible = true) {
    const progress = uploadField('upload-progress');
    const bar = uploadField('upload-progress-bar');
    const label = uploadField('upload-progress-label');
    if (!progress || !bar || !label) return;

    const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
    progress.classList.toggle('show', visible);
    progress.setAttribute('aria-hidden', String(!visible));
    bar.style.width = `${safePercent}%`;
    label.textContent = `${safePercent}%`;
}

function clearUploadProgress() {
    setUploadProgress(0, false);
}

function fileNameOrDefault(input, fallback) {
    return input.files && input.files[0] ? input.files[0].name : fallback;
}

function wireFileLabels() {
    const audio = uploadField('audio');
    const lyrics = uploadField('lyrics');
    const cover = uploadField('cover-file');
    const preview = uploadField('cover-preview');

    audio.addEventListener('change', () => {
        uploadField('audio-label').textContent = fileNameOrDefault(audio, 'Audio file');
    });

    lyrics.addEventListener('change', () => {
        uploadField('lyrics-label').textContent = fileNameOrDefault(lyrics, 'Lyrics');
    });

    cover.addEventListener('change', () => {
        uploadField('cover-label').textContent = fileNameOrDefault(cover, 'Cover art');

        if (!cover.files || !cover.files[0]) {
            preview.style.backgroundImage = 'url("/imgs/default-cover.png")';
            return;
        }

        const reader = new FileReader();
        reader.addEventListener('load', () => {
            preview.style.backgroundImage = `url("${reader.result}")`;
        });
        reader.readAsDataURL(cover.files[0]);
    });
}

function setUploading(isUploading) {
    const submit = uploadField('upload-submit');
    const reset = uploadField('upload-reset');
    submit.disabled = isUploading;
    reset.disabled = isUploading;
    submit.textContent = isUploading ? 'Uploading' : 'Upload';
}

function buildUploadFormData() {
    const formData = new FormData();
    const title = uploadField('upload-title').value.trim();
    const artist = uploadField('upload-artist').value.trim();
    const album = uploadField('upload-album').value.trim();
    const tag = uploadField('upload-tag').value.trim();
    const audio = uploadField('audio').files[0];
    const lyrics = uploadField('lyrics').files[0];
    const cover = uploadField('cover-file').files[0];

    if (!title || !artist || !album || !audio) {
        throw new Error('Title, artist, album, and audio file are required.');
    }

    formData.append('title', title);
    formData.append('artist', artist);
    formData.append('album', album);
    formData.append('tag', tag);
    formData.append('audio', audio);

    if (lyrics) {
        formData.append('lyrics', lyrics);
    }

    if (cover) {
        formData.append('cover', cover);
    }

    return formData;
}

function sendUpload(formData) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open('POST', `${API_URL}/upload-song`);
        xhr.setRequestHeader('Authorization', `Bearer ${api.getToken()}`);

        xhr.upload.addEventListener('progress', (event) => {
            if (!event.lengthComputable) {
                setUploadStatus('Uploading and preparing your song for review.');
                setUploadProgress(0);
                return;
            }

            setUploadProgress((event.loaded / event.total) * 100);
        });

        xhr.addEventListener('load', () => {
            let data = {};
            try {
                data = JSON.parse(xhr.responseText || '{}');
            } catch (error) {
                data = {};
            }
            if (xhr.status < 200 || xhr.status >= 300) {
                reject(new Error(data.error || `HTTP ${xhr.status}`));
                return;
            }

            resolve(data);
        });

        xhr.addEventListener('error', () => {
            reject(new Error('Upload failed.'));
        });

        xhr.addEventListener('abort', () => {
            reject(new Error('Upload cancelled.'));
        });

        xhr.send(formData);
    });
}

async function uploadSong(event) {
    event.preventDefault();
    clearUploadStatus();
    clearUploadProgress();

    if (!api.getToken()) {
        setUploadStatus('You need to log in before uploading.', 'error');
        return;
    }

    let formData;
    try {
        formData = buildUploadFormData();
    } catch (error) {
        setUploadStatus(error.message, 'error');
        return;
    }

    setUploading(true);
    setUploadStatus('Uploading and preparing your song for review.');
    setUploadProgress(0);

    try {
        const data = await sendUpload(formData);
        setUploadProgress(100);
        setUploadStatus(`Upload complete. "${data.title || 'song'}" is now pending review.`, 'success');
        uploadField('upload-form').reset();
        uploadField('audio-label').textContent = 'Audio file';
        uploadField('lyrics-label').textContent = 'Lyrics';
        uploadField('cover-label').textContent = 'Cover art';
        uploadField('cover-preview').style.backgroundImage = 'url("/imgs/default-cover.png")';
    } catch (error) {
        setUploadStatus(error.message || 'Upload failed.', 'error');
    } finally {
        setUploading(false);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    wireFileLabels();
    uploadField('upload-form').addEventListener('submit', uploadSong);
    uploadField('upload-form').addEventListener('reset', () => {
        clearUploadStatus();
        clearUploadProgress();
        setTimeout(() => {
            uploadField('audio-label').textContent = 'Audio file';
            uploadField('lyrics-label').textContent = 'Lyrics';
            uploadField('cover-label').textContent = 'Cover art';
            uploadField('cover-preview').style.backgroundImage = 'url("/imgs/default-cover.png")';
        }, 0);
    });
});
