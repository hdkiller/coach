type StrengthExercise = Record<string, any>

export type StrengthExerciseGroup = {
  id: string
  name: string
  exercises: StrengthExercise[]
}

const DEFAULT_GROUP_NAME = 'Routine'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function sanitizeGroupName(value: unknown) {
  const name = String(value || '').trim()
  return name || DEFAULT_GROUP_NAME
}

function nextId(prefix: string, index: number) {
  return `${prefix}-${index + 1}`
}

export function getStrengthExerciseGroupName(exercise: StrengthExercise) {
  return sanitizeGroupName(exercise?.group || exercise?.phase)
}

export function groupStrengthExercises(exercises: StrengthExercise[] | undefined | null) {
  const grouped: StrengthExerciseGroup[] = []
  const groupMap = new Map<string, StrengthExerciseGroup>()

  for (const [index, exercise] of (exercises || []).entries()) {
    const clonedExercise = clone(exercise || {})
    const groupName = getStrengthExerciseGroupName(clonedExercise)
    delete clonedExercise.phase

    let targetGroup = groupMap.get(groupName)
    if (!targetGroup) {
      targetGroup = {
        id: nextId('group', grouped.length),
        name: groupName,
        exercises: []
      }
      groupMap.set(groupName, targetGroup)
      grouped.push(targetGroup)
    }

    targetGroup.exercises.push({
      ...clonedExercise,
      group: groupName,
      _id: clonedExercise._id || nextId(`exercise-${index}`, targetGroup.exercises.length)
    })
  }

  if (grouped.length === 0) {
    return [
      {
        id: 'group-1',
        name: DEFAULT_GROUP_NAME,
        exercises: []
      }
    ]
  }

  return grouped
}

export function flattenStrengthExerciseGroups(groups: StrengthExerciseGroup[] | undefined | null) {
  const flattened: StrengthExercise[] = []

  for (const group of groups || []) {
    const groupName = sanitizeGroupName(group?.name)
    for (const exercise of group?.exercises || []) {
      const clonedExercise = clone(exercise || {})
      delete clonedExercise._id
      delete clonedExercise.phase
      flattened.push({
        ...clonedExercise,
        group: groupName
      })
    }
  }

  return flattened
}
