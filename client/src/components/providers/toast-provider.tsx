'use client';

import { Toaster } from 'sonner';

export function ToastProvider() {
    return (
        <Toaster
            position="top-right"
            toastOptions={{
                style: {
                    background: 'rgb(16, 34, 23)',
                    border: '1px solid rgba(41, 222, 113, 0.2)',
                    color: 'rgb(245, 250, 247)',
                },
                className: 'glass',
            }}
            theme="dark"
            richColors
            closeButton
        />
    );
}
