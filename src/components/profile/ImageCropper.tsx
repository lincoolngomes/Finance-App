import { useState, useRef, useEffect } from 'react'
import { Button } from '/src/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '/src/components/ui/dialog'
import { Slider } from '/src/components/ui/slider'
import { Label } from '/src/components/ui/label'
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'

interface ImageCropperProps {
  open: boolean
  imageSrc: string
  onCrop: (croppedImage: string) => void
  onClose: () => void
}

export function ImageCropper({ open, imageSrc, onCrop, onClose }: ImageCropperProps) {
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // Reset e calcular zoom inicial quando modal abre
  useEffect(() => {
    if (open && imageSrc) {
      setImageLoaded(false)
      setPosition({ x: 0, y: 0 })
      
      // Criar imagem temporária para pegar dimensões
      const img = new Image()
      img.onload = () => {
        const containerSize = 400
        const cropCircle = 250 // Círculo menor
        const imgWidth = img.width
        const imgHeight = img.height
        
        // Calcular zoom para mostrar a imagem COMPLETA (não preencher o círculo)
        const scaleToFit = Math.min(
          containerSize / imgWidth,
          containerSize / imgHeight
        )
        
        // Mostrar imagem completa com pequena margem
        setZoom(scaleToFit * 0.95)
        setImageDimensions({ width: imgWidth, height: imgHeight })
        setImageLoaded(true)
      }
      img.src = imageSrc
    }
  }, [open, imageSrc])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    e.preventDefault()
    
    const newX = e.clientX - dragStart.x
    const newY = e.clientY - dragStart.y

    setPosition({ x: newX, y: newY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Suporte a touch para dispositivos móveis
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return
    
    const touch = e.touches[0]
    setIsDragging(true)
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length === 0) return
    
    e.preventDefault()
    const touch = e.touches[0]

    const newX = touch.clientX - dragStart.x
    const newY = touch.clientY - dragStart.y

    setPosition({ x: newX, y: newY })
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const containerSize = 400
    const minZoom = Math.min(
      containerSize / imageDimensions.width,
      containerSize / imageDimensions.height
    )
    const newZoom = Math.max(minZoom, Math.min(3, zoom + delta))
    setZoom(newZoom)
  }

  const handleZoomChange = (value: number[]) => {
    setZoom(value[0])
  }

  const handleReset = () => {
    const containerSize = 400
    const scaleToFit = Math.min(
      containerSize / imageDimensions.width,
      containerSize / imageDimensions.height
    )
    setZoom(scaleToFit * 0.95)
    setPosition({ x: 0, y: 0 })
  }

  const cropImage = () => {
    if (!canvasRef.current || !imageRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = imageRef.current
    
    if (img.naturalWidth === 0) return

    const containerSize = 400
    const cropDiameter = 250
    const outputSize = 400
    
    canvas.width = outputSize
    canvas.height = outputSize

    // Limpar canvas (fundo transparente)
    ctx.clearRect(0, 0, outputSize, outputSize)

    // Posição do círculo de crop no container (centro)
    const cropX = containerSize / 2
    const cropY = containerSize / 2
    const cropRadius = cropDiameter / 2
    
    // Posição da imagem no container (com transformação)
    const imgDisplayX = (containerSize / 2) + position.x
    const imgDisplayY = (containerSize / 2) + position.y
    
    // Dimensões da imagem renderizada
    const imgDisplayWidth = img.naturalWidth * zoom
    const imgDisplayHeight = img.naturalHeight * zoom
    
    // Converter posição do círculo para coordenadas da imagem original
    // Offset do círculo em relação ao canto superior esquerdo da imagem renderizada
    const offsetXInDisplay = cropX - (imgDisplayX - imgDisplayWidth / 2)
    const offsetYInDisplay = cropY - (imgDisplayY - imgDisplayHeight / 2)
    
    // Converter para coordenadas da imagem original (sem zoom)
    const offsetXInSource = offsetXInDisplay / zoom
    const offsetYInSource = offsetYInDisplay / zoom
    const cropSizeInSource = cropDiameter / zoom
    
    // Coordenadas de início do crop na imagem original
    const sourceX = offsetXInSource - (cropSizeInSource / 2)
    const sourceY = offsetYInSource - (cropSizeInSource / 2)

    // Criar máscara circular
    ctx.save()
    ctx.beginPath()
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()
    
    // Desenhar EXATAMENTE o que está no círculo
    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      cropSizeInSource,
      cropSizeInSource,
      0,
      0,
      outputSize,
      outputSize
    )
    ctx.restore()

    // Compressão progressiva com PNG (suporta transparência)
    let croppedImage = ''
    let quality = 0.92
    const MAX_SIZE = 5 * 1024 * 1024
    
    // Tentar PNG primeiro (mantém transparência)
    croppedImage = canvas.toDataURL('image/png')
    
    // Se PNG ficar muito grande, usar JPEG com fundo branco
    if (croppedImage.length >= MAX_SIZE) {
      // Adicionar fundo branco para JPEG
      ctx.globalCompositeOperation = 'destination-over'
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, outputSize, outputSize)
      
      while (quality >= 0.1) {
        croppedImage = canvas.toDataURL('image/jpeg', quality)
        if (croppedImage.length < MAX_SIZE) break
        quality -= 0.05
      }
    }
    
    if (croppedImage.length >= MAX_SIZE) {
      alert('Imagem muito grande. Tente uma imagem menor.')
      return
    }
    
    onCrop(croppedImage)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Recortar foto de perfil</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 <strong>Instruções:</strong> Arraste a imagem para posicionar • Use o controle de zoom • Role o mouse para zoom rápido
            </p>
          </div>

          {/* Preview area */}
          <div
            ref={containerRef}
            className="relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-lg overflow-hidden cursor-move select-none mx-auto border-4 border-gray-300 dark:border-gray-700"
            style={{
              width: '400px',
              height: '400px',
              touchAction: 'none',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            {/* Image */}
            {imageSrc ? (
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                className="absolute w-full h-full object-cover user-select-none"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                  transformOrigin: 'center',
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                  userSelect: 'none',
                  display: imageLoaded ? 'block' : 'none'
                } as React.CSSProperties}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                onLoad={() => setImageLoaded(true)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                Nenhuma imagem selecionada
              </div>
            )}
            
            {/* Overlay escurecido fora do círculo */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(circle 125px at center, transparent 125px, rgba(0, 0, 0, 0.7) 125px)',
              }}
            />

            {/* Circular mask overlay - mostra onde será cortado */}
            <div
              className="absolute inset-0 pointer-events-none rounded-full border-4 border-blue-500 shadow-lg"
              style={{
                width: '250px',
                height: '250px',
                left: '75px',
                top: '75px',
                boxShadow: 'inset 0 0 20px rgba(59, 130, 246, 0.3)'
              }}
            />
            
            {!imageLoaded && imageSrc && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-800">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Carregando imagem...</p>
                </div>
              </div>
            )}
          </div>

          {/* Zoom slider */}
          <div className="space-y-2 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ZoomOut className="h-4 w-4 text-gray-500" />
                <Label htmlFor="zoom" className="text-sm font-medium">
                  Zoom: {Math.round(zoom * 100)}%
                </Label>
                <ZoomIn className="h-4 w-4 text-gray-500" />
              </div>
            </div>
            <Slider
              id="zoom"
              min={0.1}
              max={3}
              step={0.01}
              value={[zoom]}
              onValueChange={handleZoomChange}
              className="w-full"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Resetar
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button 
              onClick={cropImage} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Recortar foto
            </Button>
          </div>
        </div>

        {/* Hidden canvas for cropping */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  )
}
