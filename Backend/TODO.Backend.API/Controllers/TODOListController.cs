using Microsoft.AspNetCore.Mvc;
using TODO.Database.AccessLayer.Services;
using TODO.Database.Models.Core;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace TODO.Backend.API.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class TODOListController(
        ITODOListService tODOListService,
        ILogger<TODOListController> logger) : ControllerBase
    {
        private readonly ITODOListService _tODOListService = tODOListService;
        private readonly ILogger<TODOListController> _logger = logger;

        /// <summary>
        /// Gets all TODO items.
        /// </summary>
        /// <returns>
        /// All TODO items.
        /// <example>
        /// [
        ///   {
        ///     "title": "Buy groceries",
        ///     "description": "Buy milk and coffee",
        ///     "category": "Shopping",
        ///     "priority": "High",
        ///     "isCompleted": false
        ///   }
        /// ]
        /// </example>
        /// </returns>
        /// <response code="200">Returns all TODO items.</response>
        [HttpGet]
        [EndpointSummary("Get all TODO items")]
        public IActionResult Get()
        {
            _logger.LogInformation("Retrieving all TODO items.");
            var todos = _tODOListService.GetAll();
            return Ok(todos);
        }

        /// <summary>
        /// Gets a TODO item by title.
        /// </summary>
        /// <param name="title" example="Buy groceries">The title of the TODO item.</param>
        /// <returns>
        /// The matching TODO item.
        /// <example>
        /// {
        ///   "title": "Buy groceries",
        ///   "description": "Buy milk and coffee",
        ///   "category": "Shopping",
        ///   "priority": "High",
        ///   "isCompleted": false
        /// }
        /// </example>
        /// </returns>
        /// <response code="200">Returns the requested TODO item.</response>
        /// <response code="404">A TODO item with the supplied title was not found.</response>
        [HttpGet("{title}")]
        [EndpointSummary("Get a TODO item")]
        public ActionResult<TODOList> Get(string title)
        {
            _logger.LogDebug("Retrieving TODO item with title {Title}.", title);
            var todo = _tODOListService.GetItem(title);

            if (todo is null)
            {
                _logger.LogWarning("TODO item with title {Title} was not found.", title);
                return NotFound();
            }

            return Ok(todo);
        }

        /// <summary>
        /// Creates a TODO item.
        /// </summary>
        /// <param name="value" example='{"title":"Buy groceries","description":"Buy milk and coffee","category":"Shopping","priority":"High","isCompleted":false}'>
        /// The TODO item to create.
        /// </param>
        /// <returns>The newly created TODO item.</returns>
        /// <response code="201">The TODO item was created.</response>
        /// <response code="409">A TODO item with the same title already exists.</response>
        /// <response code="400">The TODO item could not be created.</response>
        [HttpPost]
        [EndpointSummary("Create a TODO item")]
        public IActionResult Create([FromBody] TODOList value)
        {
            try
            {
                var title = _tODOListService.AddItem(value);
                _logger.LogInformation("Created TODO item with title {Title}.", value.Title);
                return CreatedAtAction(nameof(Get), new { title }, value);
            }
            catch (DuplicateTitleException ex)
            {
                _logger.LogWarning(ex, "A TODO item with title {Title} already exists.", value.Title);
                return Conflict(new { error = ex.Message });
            }
            catch (TodoListFullException ex)
            {
                _logger.LogWarning(ex, "Could not create TODO item with title {Title} because the list is full.", value.Title);
                return BadRequest(new { error = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Could not create TODO item with title {Title}.", value.Title);
                return BadRequest(new { error = ex.Message });
            }
        }

        /// <summary>
        /// Updates a TODO item.
        /// </summary>
        /// <param name="title" example="Buy groceries">The title of the TODO item to update.</param>
        /// <param name="value" example='{"title":"Buy groceries","description":"Buy milk, coffee, and bread","category":"Shopping","priority":"Medium","isCompleted":true}'>
        /// The updated TODO item.
        /// </param>
        /// <returns>The updated TODO item.</returns>
        /// <response code="200">The TODO item was updated.</response>
        /// <response code="404">A TODO item with the supplied title was not found.</response>
        [HttpPut("{title}")]
        [EndpointSummary("Update a TODO item")]
        public IActionResult Put(string title, [FromBody] TODOList value)
        {
            _logger.LogDebug("Updating TODO item with title {Title}.", title);
            var updatedItem = _tODOListService.UpdateItem(title, value);

            if (updatedItem is null)
            {
                _logger.LogWarning("TODO item with title {Title} was not found.", title);
                return NotFound();
            }

            _logger.LogInformation("Updated TODO item with title {Title}.", title);
            return Ok(updatedItem);
        }

        /// <summary>
        /// Marks a TODO item as completed.
        /// </summary>
        /// <param name="title" example="Buy groceries">The title of the TODO item.</param>
        /// <returns>The updated TODO item.</returns>
        /// <response code="202">The TODO item was marked as completed.</response>
        /// <response code="404">A TODO item with the supplied title was not found.</response>
        [HttpPatch("[action]/{title}")]
        [EndpointSummary("Mark a TODO item as completed")]
        public IActionResult MarkAsCompleted(string title)
        {
            _logger.LogDebug("Marking TODO item with title {Title} as completed.", title);
            var todo = _tODOListService.GetItem(title);

            if (todo is null)
            {
                _logger.LogWarning("TODO item with title {Title} was not found.", title);
                return NotFound();
            }

            if (!todo.IsCompleted)
            {
                todo = _tODOListService.ToggleStatus(title);
            }

            _logger.LogInformation("TODO item with title {Title} is marked as completed.", title);
            return Accepted(todo);
        }

        /// <summary>
        /// Marks a TODO item as incomplete.
        /// </summary>
        /// <param name="title" example="Buy groceries">The title of the TODO item.</param>
        /// <returns>The updated TODO item.</returns>
        /// <response code="202">The TODO item was marked as incomplete.</response>
        /// <response code="404">A TODO item with the supplied title was not found.</response>
        [HttpPatch("[action]/{title}")]
        [EndpointSummary("Mark a TODO item as incomplete")]
        public IActionResult MarkAsInComplete(string title)
        {
            _logger.LogDebug("Marking TODO item with title {Title} as incomplete.", title);
            var todo = _tODOListService.GetItem(title);

            if (todo is null)
            {
                _logger.LogWarning("TODO item with title {Title} was not found.", title);
                return NotFound();
            }

            if (todo.IsCompleted)
            {
                todo = _tODOListService.ToggleStatus(title);
            }

            _logger.LogInformation("TODO item with title {Title} is marked as incomplete.", title);
            return Accepted(todo);
        }

        /// <summary>
        /// Deletes a TODO item.
        /// </summary>
        /// <param name="title" example="Buy groceries">The title of the TODO item to delete.</param>
        /// <response code="204">The TODO item was deleted.</response>
        /// <response code="404">A TODO item with the supplied title was not found.</response>
        [HttpDelete("{title}")]
        [EndpointSummary("Delete a TODO item")]
        public IActionResult Delete(string title)
        {
            if (!_tODOListService.DeleteItem(title))
            {
                _logger.LogWarning("TODO item with title {Title} could not be deleted because it was not found.", title);
                return NotFound();
            }

            _logger.LogInformation("Deleted TODO item with title {Title}.", title);
            return NoContent();
        }

        /// <summary>
        /// Removes all completed TODO items.
        /// </summary>
        /// <returns>
        /// A message indicating whether the completed items were cleared.
        /// <example>
        /// {
        ///   "message": "Completed tasks cleared."
        /// }
        /// </example>
        /// </returns>
        /// <response code="200">All completed TODO items were removed.</response>
        [HttpPost("[action]")]
        [EndpointSummary("Clear all completed TODO items")]
        public IActionResult ClearCompleted()
        {
            _tODOListService.ClearCompleted();

            _logger.LogInformation("Cleared all completed TODO items.");
            return Ok(new { message = "Completed tasks cleared." });
        }
    }
}
