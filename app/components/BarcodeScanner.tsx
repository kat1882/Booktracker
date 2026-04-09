'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/browser'

interface ScanResult {
  type: 'edition' | 'book'
  id: string
  title: string
  author: string
  cover?: string
  editionName?: string
  source?: string
  isbn: string
}

interface Props {
  onClose: () => void
  onResult: (result: ScanResult) => void
}

export default function BarcodeScanner({ onClose, onResult }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const [status, setStatus] = useState<'starting' | 'scanning' | 'found' | 'error'>('starting')
  const [error, setError] = useState('')
  const [lastScanned, setLastScanned] = useState('')
  const [looking, setLooking] = useState(false)

  useEffect(() => {
    let active = true

    async function start() {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const reader = new BrowserMultiFormatReader()
        readerRef.current = reader

        await reader.decodeFromVideoDevice(undefined, videoRef.current!, async (result, err) => {
          if (!active) return
          if (result) {
            const isbn = result.getText()
            if (isbn === lastScanned || looking) return
            if (!/^(978|979|0|1)\d{8,12}$/.test(isbn.replace(/-/g, ''))) return

            setLastScanned(isbn)
            setLooking(true)
            setStatus('found')
            await lookup(isbn)
            setLooking(false)
          }
        })
        if (active) setStatus('scanning')
      } catch (e) {
        if (active) {
          setError('Could not access camera. Please allow camera permissions and try again.')
          setStatus('error')
        }
      }
    }

    start()

    return () => {
      active = false
      readerRef.current?.reset()
    }
  }, [])

  async function lookup(isbn: string) {
    setStatus('found')

    // 1. Check our DB for a matching edition
    try {
      const res = await fetch(`/api/editions/search?q=${encodeURIComponent(isbn)}`)
      const data = await res.json()
      if (data.editions?.length > 0) {
        const ed = data.editions[0]
        onResult({
          type: 'edition',
          id: ed.id,
          title: ed.book?.title ?? ed.edition_name,
          author: ed.book?.author ?? '',
          cover: ed.cover_image,
          editionName: ed.edition_name,
          source: ed.source?.name,
          isbn,
        })
        return
      }
    } catch {}

    // 2. Fall back to Google Books
    try {
      const res = await fetch(`/api/books/search?q=isbn:${isbn}`)
      const data = await res.json()
      if (data.books?.length > 0) {
        const b = data.books[0]
        onResult({
          type: 'book',
          id: `gb_${b.id}`,
          title: b.volumeInfo.title,
          author: b.volumeInfo.authors?.[0] ?? 'Unknown',
          cover: b.volumeInfo.imageLinks?.thumbnail?.replace('http://', 'https://'),
          isbn,
        })
        return
      }
    } catch {}

    // 3. Nothing found
    setError(`No match found for ISBN ${isbn}. Try scanning again or search manually.`)
    setStatus('scanning')
    setLastScanned('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-base font-semibold text-white">Scan Barcode</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-xl leading-none">✕</button>
        </div>

        {/* Camera */}
        <div className="relative bg-black" style={{ aspectRatio: '4/3' }}>
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />

          {/* Scanning overlay */}
          {status === 'scanning' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-56 h-36 border-2 border-violet-400 rounded-xl relative">
                <div className="absolute inset-x-0 top-0 h-0.5 bg-violet-400 animate-scan" />
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-violet-300 rounded-tl" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-violet-300 rounded-tr" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-violet-300 rounded-bl" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-violet-300 rounded-br" />
              </div>
            </div>
          )}

          {/* Status overlays */}
          {status === 'starting' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-400">Starting camera…</p>
              </div>
            </div>
          )}
          {status === 'found' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {status === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <p className="text-sm text-red-400 text-center">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4">
          {error && status === 'scanning' && (
            <p className="text-xs text-amber-400 mb-3 text-center">{error}</p>
          )}
          <p className="text-xs text-gray-600 text-center">
            Point the camera at the barcode on the back of a book
          </p>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: calc(100% - 2px); }
          100% { top: 0; }
        }
        .animate-scan { animation: scan 2s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
