export default defineEventHandler((event) => {
  return {
    status: 'success',
    data: [
      {
        id: 'chk_1',
        date: new Date().toISOString(),
        mood: 'Good',
        energyLevel: 8,
        notes: 'Feeling great this week!',
        status: 'reviewed'
      },
      {
        id: 'chk_2',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        mood: 'Okay',
        energyLevel: 6,
        notes: 'A bit tired from work.',
        status: 'pending'
      }
    ]
  }
})
