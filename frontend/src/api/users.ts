import api from './client'

export type User = {
    id: string
    username?: string | null
    phone_number?: string | null
    avatar?: string | null
}

export const getUserProfile = async (
    userId: string
): Promise<User> => {
    const response = await api.get<User>(
        `/api/user/${userId}/profile`
    )

    return response.data
}

export const getUserAvatar = async (
    userId: string
): Promise<string> => {
    const response = await api.get<Blob>(
        `/api/user/${userId}/avatar`,
        {
            responseType: 'blob',
        }
    )

    return URL.createObjectURL(response.data)
}


export const getUserByPhone = (phone: string) => 
    api.get('/api/user', { params: { phone_number: phone } }).then(r => r.data)

export const getCurrentUserProfile = () =>
    api
        .get('/api/user/profile')
        .then((response) => response.data)


export type UpdateProfileData = {
    username?: string
    phoneNumber?: string
    description?: string
    avatarFile?: File | null
}


export const updateProfile = (
    data: UpdateProfileData
) => {
    const formData =
        new FormData()

    formData.append(
        'username',
        data.username || ''
    )

    formData.append(
        'phone_number',
        data.phoneNumber || ''
    )

    formData.append(
        'description',
        data.description || ''
    )

    if (data.avatarFile) {
        formData.append(
            'avatar_upload_file',
            data.avatarFile,
            data.avatarFile.name
        )
    }

    return api
        .put(
            '/api/user/update/profile',
            formData
        )
        .then(
            response => response.data
        )
}


export const getCurrentUserAvatar = async (): Promise<string | null> => {
    try {
        const response = await api.get('/api/user/avatar', {
            responseType: 'blob',
        })

        if (!response.data || response.data.size === 0) {
            return null
        }

        return URL.createObjectURL(response.data)
    } catch (error) {
        return null
    }
}

export const getUserLastSeenAt = (userId: string) =>
  api.get(`/api/user/${userId}/last_seen`).then((response) => response.data)
