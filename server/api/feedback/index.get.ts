export default defineEventHandler((event) => {
  return {
    status: 'success',
    data: [
      {
        id: 'fb_1',
        checkInId: 'chk_1',
        date: new Date().toISOString(),
        coachName: 'Coach Nick',
        videoUrl: 'https://komododecks.com/recordings/embed/mock-video-id',
        message: 'Great progress this week. Let us increase the volume slightly for next week.'
      }
    ]
  }
})
